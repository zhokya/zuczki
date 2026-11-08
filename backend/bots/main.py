import sys
import time
from collections import deque
from typing import Optional

import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F

PORT = int(sys.argv[1])
NUM_FEATURES = int(sys.argv[2])
TRAINING_MODE = sys.argv[3] == 'train'

# -----------------------------
# Global settings
# -----------------------------

DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")
if DEVICE.type == "cuda":
    torch.backends.cuda.matmul.allow_tf32 = True
    torch.backends.cudnn.allow_tf32 = True

STATE_DIM = NUM_FEATURES - 1  # do not feed reward feature into the model
ANGLE_BINS = 3
ACTION_DIM = ANGLE_BINS * 2

GAMMA = 0.994
LR = 3e-4
BATCH_SIZE = 256
REPLAY_CAPACITY = 200_000
MINIMUM_REPLAY_ELEMENTS = 4_000
TARGET_UPDATE_EVERY = 6_000
GRAD_STEPS_PER_CALL = 2
MAX_GRAD_NORM = 10.0
EPS_START = 1.0
EPS_END = 0.05
EPS_DECAY_STEPS = 600_000
PRINT_EVERY_SEC = 10.0

EPS = 1e-6


# -----------------------------
# Utilities
# -----------------------------


def _now() -> float:
    return time.time()


class RunningMeanStd:
    """Online mean/variance estimator using batch updates."""

    def __init__(self, shape):
        self.mean = np.zeros(shape, dtype=np.float64)
        self.var = np.ones(shape, dtype=np.float64)
        self.count = 1e-4

    def update(self, x: np.ndarray):
        x = np.asarray(x, dtype=np.float64)
        if x.ndim == 1:
            x = x[None, :]
        batch_mean = x.mean(axis=0)
        batch_var = x.var(axis=0)
        batch_count = x.shape[0]

        delta = batch_mean - self.mean
        tot_count = self.count + batch_count
        new_mean = self.mean + delta * batch_count / tot_count

        m_a = self.var * self.count
        m_b = batch_var * batch_count
        M2 = m_a + m_b + np.square(delta) * self.count * batch_count / tot_count
        new_var = M2 / tot_count

        self.mean = new_mean
        self.var = np.maximum(new_var, 1e-8)
        self.count = tot_count

    @property
    def std(self):
        return np.sqrt(self.var + 1e-8)


class ReplayBuffer:
    def __init__(self, capacity: int, state_dim: int):
        self.capacity = capacity
        self.state_dim = state_dim
        self.states = np.zeros((capacity, state_dim), dtype=np.float32)
        self.next_states = np.zeros((capacity, state_dim), dtype=np.float32)
        self.actions = np.zeros((capacity,), dtype=np.int64)
        self.rewards = np.zeros((capacity,), dtype=np.float32)
        self.dones = np.zeros((capacity,), dtype=np.bool_)
        self.pos = 0
        self.size = 0

    def add(self, state, action: int, reward: float, next_state, done: bool):
        idx = self.pos
        self.states[idx] = state
        self.next_states[idx] = next_state if next_state is not None else 0.0
        self.actions[idx] = int(action)
        self.rewards[idx] = float(reward)
        self.dones[idx] = bool(done)
        self.pos = (self.pos + 1) % self.capacity
        self.size = min(self.size + 1, self.capacity)

    def sample(self, batch_size: int):
        idx = np.random.randint(0, self.size, size=batch_size)
        return (
            self.states[idx],
            self.actions[idx],
            self.rewards[idx],
            self.next_states[idx],
            self.dones[idx],
        )


class DuelingDQN(nn.Module):
    def __init__(self, input_dim: int, action_dim: int):
        super().__init__()
        self.backbone = nn.Sequential(
            nn.Linear(input_dim, 32),
            nn.LayerNorm(32),
            nn.SiLU(),
            nn.Linear(32, 32),
            nn.LayerNorm(32),
            nn.SiLU(),
            nn.Linear(32, 32),
            nn.LayerNorm(32),
            nn.SiLU(),
        )
        self.value = nn.Sequential(
            nn.Linear(32, 16),
            nn.SiLU(),
            nn.Linear(16, 1),
        )
        self.advantage = nn.Sequential(
            nn.Linear(32, 16),
            nn.SiLU(),
            nn.Linear(16, action_dim),
        )

    def forward(self, x):
        z = self.backbone(x)
        v = self.value(z)
        a = self.advantage(z)
        return v + a - a.mean(dim=1, keepdim=True)


class DQNAgent:
    def __init__(self, state_dim: int, action_dim: int):
        self.state_dim = state_dim
        self.action_dim = action_dim
        self.online = DuelingDQN(state_dim, action_dim).to(DEVICE)
        self.target = DuelingDQN(state_dim, action_dim).to(DEVICE)
        self.target.load_state_dict(self.online.state_dict())
        self.target.eval()
        self.optimizer = torch.optim.AdamW(self.online.parameters(), lr=LR, eps=1e-5)
        self.replay = ReplayBuffer(REPLAY_CAPACITY, state_dim)
        self.obs_rms = RunningMeanStd((state_dim,))
        self.train_steps = 0
        self.env_steps = 0

    def normalize_obs(self, obs: np.ndarray) -> np.ndarray:
        obs = np.asarray(obs, dtype=np.float32)
        norm = (obs - self.obs_rms.mean.astype(np.float32)) / self.obs_rms.std.astype(np.float32)
        return np.clip(norm, -5.0, 5.0).astype(np.float32)

    def normalize_reward(self, reward: float) -> float:
        return reward

    def update_target(self):
        print('*SWITCHED MODELS*')
        self.target.load_state_dict(self.online.state_dict())
        self.target.eval()

    def train_once(self):
        if self.replay.size < MINIMUM_REPLAY_ELEMENTS:
            return

        states, actions, rewards, next_states, dones = self.replay.sample(BATCH_SIZE)

        states_t = torch.from_numpy(states).to(DEVICE, non_blocking=True)
        actions_t = torch.from_numpy(actions).to(DEVICE, non_blocking=True).long()
        rewards_t = torch.from_numpy(rewards).to(DEVICE, non_blocking=True)
        next_states_t = torch.from_numpy(next_states).to(DEVICE, non_blocking=True)
        dones_t = torch.from_numpy(dones.astype(np.float32)).to(DEVICE, non_blocking=True)

        q = self.online(states_t).gather(1, actions_t.unsqueeze(1)).squeeze(1)

        with torch.no_grad():
            next_actions = self.online(next_states_t).argmax(dim=1)
            next_q = self.target(next_states_t).gather(1, next_actions.unsqueeze(1)).squeeze(1)
            target = rewards_t + (1.0 - dones_t) * GAMMA * next_q

        loss = F.smooth_l1_loss(q, target)

        self.optimizer.zero_grad(set_to_none=True)
        loss.backward()
        torch.nn.utils.clip_grad_norm_(self.online.parameters(), MAX_GRAD_NORM)
        self.optimizer.step()

        self.train_steps += 1
        if self.train_steps % TARGET_UPDATE_EVERY == 0:
            self.update_target()

    def epsilon(self) -> float:
        if not TRAINING_MODE:
            return 0
        t = min(self.env_steps / EPS_DECAY_STEPS, 1.0)
        return EPS_START + t * (EPS_END - EPS_START)

    @torch.no_grad()
    def act(self, obs_batch: np.ndarray) -> np.ndarray:
        obs_t = torch.from_numpy(obs_batch).to(DEVICE, non_blocking=True)
        q = self.online(obs_t)
        greedy = q.argmax(dim=1).cpu().numpy()

        eps = self.epsilon()
        if eps <= 0.0:
            return greedy

        random_mask = np.random.rand(obs_batch.shape[0]) < eps
        if random_mask.any():
            greedy = greedy.copy()
            greedy[random_mask] = np.random.randint(0, self.action_dim, size=int(random_mask.sum()))
        return greedy


# -----------------------------
# Global state
# -----------------------------

_agent: Optional[DQNAgent] = None
_last_state = None          # normalized state per slot
_last_action = None         # int action per slot
_last_reward = None         # cumulative reward baseline per slot
_last_life = None           # lifetime tick baseline per slot
_has_prev = None            # bool per slot
_ep_len = None              # episode length per slot

_recent_lifetimes = deque(maxlen=256)
_recent_episode_returns = deque(maxlen=256)
_recent_step_rewards = deque(maxlen=4096)
_last_print_time = _now()


# -----------------------------
# Action mapping
# -----------------------------


def _decode_action(action_id: np.ndarray):
    action_id = np.asarray(action_id, dtype=np.int64)
    angle_bin = action_id // 2
    flags = action_id % 2

    target_angles = (angle_bin.astype(np.float32) * (2.0 * np.pi / ANGLE_BINS)).astype(np.float32)
    clickeds = (flags == 1).astype(np.uint8)
    powerupings = (flags == 2).astype(np.uint8)
    return target_angles, clickeds, powerupings


# -----------------------------
# Init / update loop
# -----------------------------


def _ensure_init(n: int):
    global _agent, _last_state, _last_action, _last_reward, _last_life, _has_prev, _ep_len

    if _agent is None:
        _agent = DQNAgent(STATE_DIM, ACTION_DIM)

    if _last_state is None:
        max_slots = n
        _last_state = np.zeros((max_slots, STATE_DIM), dtype=np.float32)
        _last_action = np.full((max_slots,), -1, dtype=np.int64)
        _last_reward = np.zeros((max_slots,), dtype=np.float32)
        _last_life = np.zeros((max_slots,), dtype=np.float32)
        _has_prev = np.zeros((max_slots,), dtype=np.bool_)
        _ep_len = np.zeros((max_slots,), dtype=np.int32)
    elif n > _last_state.shape[0]:
        grow = n - _last_state.shape[0]
        _last_state = np.concatenate([_last_state, np.zeros((grow, STATE_DIM), dtype=np.float32)], axis=0)
        _last_action = np.concatenate([_last_action, np.full((grow,), -1, dtype=np.int64)], axis=0)
        _last_reward = np.concatenate([_last_reward, np.zeros((grow,), dtype=np.float32)], axis=0)
        _last_life = np.concatenate([_last_life, np.zeros((grow,), dtype=np.float32)], axis=0)
        _has_prev = np.concatenate([_has_prev, np.zeros((grow,), dtype=np.bool_)], axis=0)
        _ep_len = np.concatenate([_ep_len, np.zeros((grow,), dtype=np.int32)], axis=0)


def _process_transitions(features: np.ndarray, lifetime_ticks: np.ndarray):
    global _last_state, _last_action, _last_reward, _last_life, _has_prev, _ep_len
    assert _agent is not None

    n = features.shape[0]

    # Update observation normalization with the current raw features (excluding reward).
    _agent.obs_rms.update(features[:, 1:].astype(np.float64))

    # Process each slot independently.
    for i in range(n):
        raw_obs = features[i, 1:].astype(np.float32, copy=False)
        obs = _agent.normalize_obs(raw_obs)

        curr_reward = float(features[i, 0])
        curr_life = int(lifetime_ticks[i])

        if _has_prev[i]:
            if curr_life < _last_life[i]:
                # Respawn detected. Close the previous episode.
                if _last_action[i] >= 0:
                    _agent.replay.add(_last_state[i], int(_last_action[i]), 0.0, obs, True)

                if _ep_len[i] > 0:
                    _recent_lifetimes.append(float(_last_life[i]))
                    # _recent_episode_returns.append(float(_last_reward[i]))  # TODO: CHANGE ME!
                    _recent_episode_returns.append(abs(float(_last_reward[i])))

                _ep_len[i] = 0
                _last_reward[i] = curr_reward
                _last_life[i] = curr_life
                _last_state[i] = obs
                continue

            # Same player; create a standard transition.
            step_reward = curr_reward - _last_reward[i]
            norm_reward = _agent.normalize_reward(step_reward)

            if _last_action[i] >= 0:
                _agent.replay.add(_last_state[i], int(_last_action[i]), norm_reward, obs, False)

            _ep_len[i] += 1
            _recent_step_rewards.append(float(step_reward))

        else:
            # First observation for this slot.
            _ep_len[i] = 0

        _last_state[i] = obs
        _last_action[i] = -1  # action for the current state will be filled after selecting actions
        _last_reward[i] = curr_reward
        _last_life[i] = curr_life
        _has_prev[i] = True


def _select_actions(features: np.ndarray) -> np.ndarray:
    assert _agent is not None
    n = features.shape[0]
    state_batch = np.empty((n, STATE_DIM), dtype=np.float32)
    for i in range(n):
        state_batch[i] = _agent.normalize_obs(features[i, 1:].astype(np.float32, copy=False))

    action_ids = _agent.act(state_batch)
    return action_ids


def _train_and_report():
    global _last_print_time
    assert _agent is not None

    for _ in range(GRAD_STEPS_PER_CALL):
        _agent.train_once()

    now = _now()
    if now - _last_print_time >= PRINT_EVERY_SEC:
        _last_print_time = now
        tps = float(_agent.env_steps) / max(now - _start_time, 1e-6)
        avg_life_sec = (float(np.mean(_recent_lifetimes)) / 24.0) if _recent_lifetimes else 0.0
        avg_return = float(np.mean(_recent_episode_returns)) if _recent_episode_returns else 0.0
        avg_step_reward = float(np.mean(_recent_step_rewards)) if _recent_step_rewards else 0.0
        sys.stdout.write(
            f"[DQN] tps={tps:.2f} | avg_recent_lifetime={avg_life_sec:.2f}s | "
            f"avg_episode_return={avg_return:.4f} | avg_step_reward={avg_step_reward:.4f} | "
            f"buffer={_agent.replay.size} | eps={_agent.epsilon():.3f}\n"
        )
        sys.stdout.flush()
        torch.save({
            'model': _agent.online.state_dict(), 
            'obs_rms_mean': torch.tensor(_agent.obs_rms.mean),
            'obs_rms_var': torch.tensor(_agent.obs_rms.var)
        }, 'trained.pt')


# -----------------------------
# Public API
# -----------------------------

_start_time = _now()


def get_actions(features: np.ndarray, lifetime_ticks: np.ndarray):
    global _agent

    if not TRAINING_MODE:
        if _agent is None:
            _agent = DQNAgent(STATE_DIM, ACTION_DIM)
            state_dict = torch.load('trained.pt')
            _agent.online.load_state_dict(state_dict['model'])
            _agent.obs_rms.mean = state_dict['obs_rms_mean'].numpy()
            _agent.obs_rms.var = state_dict['obs_rms_var'].numpy()
        action_ids = _select_actions(features)
        target_angles, clickeds, powerupings = _decode_action(action_ids)
        return target_angles.astype(np.float32), clickeds.astype(np.uint8), powerupings.astype(np.uint8)

    features = np.asarray(features, dtype=np.float32)
    lifetime_ticks = np.asarray(lifetime_ticks, dtype=np.float32)
    n = features.shape[0]

    _ensure_init(n)
    assert _agent is not None
    _agent.env_steps += 1

    # 1) Convert the previous call into training transitions.
    _process_transitions(features, lifetime_ticks)

    # 2) Train.
    _train_and_report()

    # 3) Choose actions for the current observations.
    action_ids = _select_actions(features)
    target_angles, clickeds, powerupings = _decode_action(action_ids)

    # 4) Save the chosen actions as the baseline for the next call.
    for i in range(n):
        _last_action[i] = int(action_ids[i])

    return target_angles.astype(np.float32), clickeds.astype(np.uint8), powerupings.astype(np.uint8)


import asyncio
import websockets
async def run():
    async with websockets.connect(f"ws://127.0.0.1:{PORT}", max_size=None) as ws:
        print(f"Python client connected to node in {'training' if TRAINING_MODE else 'inference'} mode")

        while True:
            msg = await ws.recv()

            if not isinstance(msg, bytes):
                continue

            n = np.frombuffer(msg, dtype=np.int32, count=1, offset=0)[0]

            feature_offset = 4
            feature_count = n * NUM_FEATURES
            features = np.frombuffer(msg, dtype=np.float32, count=feature_count, offset=feature_offset).reshape(n, NUM_FEATURES)

            lifetime_offset = feature_offset + feature_count * 4
            lifetime_ticks = np.frombuffer(msg, dtype=np.int32, count=n, offset=lifetime_offset)

            target_angles, clickeds, powerupings = get_actions(features, lifetime_ticks)

            response = b"".join([
                target_angles.astype(
                    np.float32,
                    copy=False
                ).tobytes(),

                clickeds.astype(
                    np.uint8,
                    copy=False
                ).tobytes(),

                powerupings.astype(
                    np.uint8,
                    copy=False
                ).tobytes()
            ])

            sys.stdout.flush()

            await ws.send(response)

if __name__ == "__main__":
    asyncio.run(run())
