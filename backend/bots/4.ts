import type { Game } from "../game.ts";
import type { Beetle } from "../../shared/types.ts";

type TunableWeights = {
  pointWeight: number;
  pointRadius: number;
  rubyWeight: number;
  rubyRadius: number;
  huntWeight: number;
  huntRadius: number;
  avoidWeight: number;
  avoidRadius: number;
  edgeWeight: number;
  edgeRadius: number;
  inertiaWeight: number;
  clickThreshold: number;
  clickSizeGate: number;
};

const DEFAULT_WEIGHTS: TunableWeights = {
  // These values were tuned on a lightweight synthetic search and then rounded
  // to stable, readable numbers.
  pointWeight: 2.8,
  pointRadius: 22,
  rubyWeight: 5.2,
  rubyRadius: 21,
  huntWeight: 2.4,
  huntRadius: 15,
  avoidWeight: 4.0,
  avoidRadius: 11.5,
  edgeWeight: 4.4,
  edgeRadius: 9.2,
  inertiaWeight: 0.45,
  clickThreshold: 0.42,
  clickSizeGate: 3.65,
};

const TAU = Math.PI * 2;
const EPS = 1e-9;
const MAP_SIZE = 67;
const MAX_SIZE = 4;

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function wrapAngle(a: number): number {
  a %= TAU;
  if (a <= -Math.PI) a += TAU;
  if (a > Math.PI) a -= TAU;
  return a;
}

function angleDelta(from: number, to: number): number {
  return wrapAngle(to - from);
}

function rotateAngleTowards(current: number, target: number, maxDelta: number): number {
  const delta = clamp(angleDelta(current, target), -maxDelta, maxDelta);
  return wrapAngle(current + delta);
}

function hypot2(x: number, y: number): number {
  return x * x + y * y;
}

function len(x: number, y: number): number {
  return Math.sqrt(hypot2(x, y));
}

function addWeightedDirection(
  acc: { x: number; y: number },
  dx: number,
  dy: number,
  weight: number,
  minDist = EPS,
): void {
  const d2 = dx * dx + dy * dy;
  if (d2 <= minDist * minDist) return;
  const d = Math.sqrt(d2);
  acc.x += (dx / d) * weight;
  acc.y += (dy / d) * weight;
}

function scoreEnemyOpportunity(
  beetle: Beetle,
  enemy: Beetle,
  moveX: number,
  moveY: number,
  weights: TunableWeights,
): number {
  const dx = enemy.x - beetle.x;
  const dy = enemy.y - beetle.y;
  const d = Math.sqrt(dx * dx + dy * dy) + EPS;

  const fx = Math.cos(enemy.angle);
  const fy = Math.sin(enemy.angle);

  // Positive when we are behind the enemy relative to its facing direction.
  const behindness = Math.max(0, -((dx * fx + dy * fy) / d));

  const backX = enemy.x - fx * (enemy.size + beetle.size + 0.8);
  const backY = enemy.y - fy * (enemy.size + beetle.size + 0.8);

  const bdx = backX - (beetle.x + moveX);
  const bdy = backY - (beetle.y + moveY);
  const backDist = Math.sqrt(bdx * bdx + bdy * bdy);

  const closeness = Math.max(0, (weights.huntRadius - backDist) / weights.huntRadius);
  const sizeAdv = beetle.size - enemy.size;

  // Hunting smaller beetles is usually the safest high-score play.
  // Chasing much larger beetles is still allowed, but softer.
  const sizeFactor =
    sizeAdv >= 0
      ? 1 + 0.25 * clamp(sizeAdv, 0, 3)
      : 0.7 + 0.15 * clamp(-sizeAdv, 0, 2);

  return behindness * closeness * sizeFactor;
}

function buildDesireVector(game: Game, beetle: Beetle, weights: TunableWeights) {
  const desire = { x: Math.cos(beetle.angle) * weights.inertiaWeight, y: Math.sin(beetle.angle) * weights.inertiaWeight };
  let bestClickOpportunity = 0;

  // Points: steady attraction, but only when they are reasonably close.
  game.points.forEach((point) => {
    const dx = point[0] - beetle.x;
    const dy = point[1] - beetle.y;
    const d = Math.sqrt(dx * dx + dy * dy);

    if (d <= weights.pointRadius) {
      const strength = weights.pointWeight * (weights.pointRadius - d) / weights.pointRadius / (1 + 0.08 * d);
      addWeightedDirection(desire, dx, dy, strength, 0.25);
    }
  });

  // Rubies: much stronger, but slightly gated by size because the size drop is valuable.
  game.rubys.forEach((ruby) => {
    if (ruby.protectionTicks > 0) return;

    const dx = ruby.x - beetle.x;
    const dy = ruby.y - beetle.y;
    const d = Math.sqrt(dx * dx + dy * dy);

    if (d <= weights.rubyRadius) {
      const sizeBonus = clamp((beetle.size - 1) / 3, 0.25, 1.35);
      const rubyValue = ruby.hp * 100;
      const strength =
        weights.rubyWeight * sizeBonus * (rubyValue / 100) * (weights.rubyRadius - d) / weights.rubyRadius / (1 + 0.06 * d);
      addWeightedDirection(desire, dx, dy, strength, 0.25);
    }
  });

  // Beetles: aim for their backs, but stay away from bad-side collisions.
  game.beetles.forEach((enemy) => {
    if (enemy.id === beetle.id) return;

    const dx = enemy.x - beetle.x;
    const dy = enemy.y - beetle.y;
    const d = Math.sqrt(dx * dx + dy * dy) + EPS;

    const fx = Math.cos(enemy.angle);
    const fy = Math.sin(enemy.angle);
    const behindness = Math.max(0, -((dx * fx + dy * fy) / d));

    const backX = enemy.x - fx * (enemy.size + beetle.size + 0.8);
    const backY = enemy.y - fy * (enemy.size + beetle.size + 0.8);

    const bdx = backX - beetle.x;
    const bdy = backY - beetle.y;
    const backDist = Math.sqrt(bdx * bdx + bdy * bdy);

    if (backDist <= weights.huntRadius) {
      const sizeAdv = beetle.size - enemy.size;
      const sizeFactor =
        sizeAdv >= 0
          ? 1 + 0.25 * clamp(sizeAdv, 0, 3)
          : 0.7 + 0.15 * clamp(-sizeAdv, 0, 2);

      const hunt = weights.huntWeight * behindness * sizeFactor * (weights.huntRadius - backDist) / weights.huntRadius;
      addWeightedDirection(desire, bdx, bdy, hunt, 0.25);
    }

    // Avoid unnecessary body collisions when not lined up for a back hit.
    const safeDist = beetle.size + enemy.size + 0.7;
    if (d < weights.avoidRadius) {
      const danger = (weights.avoidRadius - d) / weights.avoidRadius;
      const antiBack = 1 - 0.7 * behindness;
      const repulse = weights.avoidWeight * danger * antiBack;
      desire.x -= (dx / d) * repulse;
      desire.y -= (dy / d) * repulse;
    }

    // Strong opportunity tracking for click decisions.
    const opportunity = scoreEnemyOpportunity(beetle, enemy, 0, 0, weights);
    bestClickOpportunity = Math.max(bestClickOpportunity, opportunity);

    // Soft pressure to keep slightly away from the exact collision shell unless the
    // back-hit opportunity is real.
    if (d < safeDist) {
      const overlap = safeDist - d;
      const shellRepel = (1 - behindness) * overlap * 0.6;
      desire.x -= (dx / d) * shellRepel;
      desire.y -= (dy / d) * shellRepel;
    }
  });

  // World edge: radial push toward center when the next move would get close.
  const distFromCenter = Math.sqrt(beetle.x * beetle.x + beetle.y * beetle.y);
  const freeSpace = MAP_SIZE - beetle.size - distFromCenter;
  if (freeSpace < weights.edgeRadius) {
    const inward = (weights.edgeRadius - freeSpace) / weights.edgeRadius;
    const edgePush = weights.edgeWeight * inward * inward;
    if (distFromCenter > EPS) {
      desire.x -= (beetle.x / distFromCenter) * edgePush;
      desire.y -= (beetle.y / distFromCenter) * edgePush;
    }
  }

  return { desire, bestClickOpportunity };
}

function searchWeights(): TunableWeights {
  // Lightweight local search helper.
  // It is intentionally kept simple so it can be run from the same file when tuning.
  const rng = Math.random;
  let best = { ...DEFAULT_WEIGHTS };
  let bestScore = -Infinity;

  function sampleWeights(): TunableWeights {
    return {
      pointWeight: 2.0 + rng() * 2.2,
      pointRadius: 14 + rng() * 12,
      rubyWeight: 3.0 + rng() * 4.0,
      rubyRadius: 14 + rng() * 14,
      huntWeight: 1.2 + rng() * 2.8,
      huntRadius: 10 + rng() * 10,
      avoidWeight: 2.0 + rng() * 4.0,
      avoidRadius: 7 + rng() * 8,
      edgeWeight: 2.5 + rng() * 4.5,
      edgeRadius: 6 + rng() * 6,
      inertiaWeight: 0.15 + rng() * 0.8,
      clickThreshold: 0.25 + rng() * 0.35,
      clickSizeGate: 3.1 + rng() * 0.6,
    };
  }

  function proxyScore(w: TunableWeights): number {
    // A tiny proxy objective: reward strong attraction to nearby points/rubies,
    // prioritize back-hit opportunities, and punish edge exposure / crowded danger.
    let total = 0;
    for (let i = 0; i < 200; i++) {
      const x = (rng() - 0.5) * 120;
      const y = (rng() - 0.5) * 120;
      const size = 1 + rng() * 3;
      const angle = (rng() - 0.5) * TAU;

      const dummy: Beetle = {
        x,
        y,
        size,
        angle,
        vx: 0,
        vy: 0,
        score: 0,
        id: "bot",
      };

      const fakeGame = {
        points: new Map<number, [number, number, boolean]>(),
        rubys: new Map<number, { id: number; x: number; y: number; baseSize: number; hp: number; protectionTicks: number }>(),
        beetles: new Map<string, Beetle>(),
      } as unknown as Game;

      const nPoints = 1 + Math.floor(rng() * 10);
      for (let p = 0; p < nPoints; p++) {
        const px = x + (rng() - 0.5) * 40;
        const py = y + (rng() - 0.5) * 40;
        fakeGame.points.set(p, [px, py, false]);
      }

      const nRubies = Math.floor(rng() * 4);
      for (let r = 0; r < nRubies; r++) {
        fakeGame.rubys.set(r, {
          id: r,
          x: x + (rng() - 0.5) * 50,
          y: y + (rng() - 0.5) * 50,
          baseSize: 1,
          hp: 0.15 + rng() * 0.8,
          protectionTicks: rng() < 0.25 ? 10 : 0,
        });
      }

      const nEnemies = Math.floor(rng() * 6);
      for (let e = 0; e < nEnemies; e++) {
        const enemy: Beetle = {
          x: x + (rng() - 0.5) * 30,
          y: y + (rng() - 0.5) * 30,
          size: 1 + rng() * 3,
          angle: (rng() - 0.5) * TAU,
          vx: 0,
          vy: 0,
          score: 0,
          id: `e${e}`,
        };
        fakeGame.beetles.set(enemy.id, enemy);
      }

      const { desire, bestClickOpportunity } = buildDesireVector(fakeGame, dummy, w);
      const score = len(desire.x, desire.y) - Math.max(0, Math.hypot(x, y) + size - (MAP_SIZE - 0.8)) * 2;
      total += score + (bestClickOpportunity > w.clickThreshold ? 0.35 : 0);
    }
    return total / 200;
  }

  for (let i = 0; i < 100; i++) {
    const candidate = sampleWeights();
    const s = proxyScore(candidate);
    if (s > bestScore) {
      bestScore = s;
      best = candidate;
    }
  }

  return best;
}

// Optional local tuning hook. Leave disabled in normal use.
const WEIGHTS = searchWeights();

export function updateBot(game: Game, beetle: Beetle) {
  const { desire, bestClickOpportunity } = buildDesireVector(game, beetle, WEIGHTS);

  let targetAngle = beetle.angle;
  if (Math.abs(desire.x) > EPS || Math.abs(desire.y) > EPS) {
    targetAngle = Math.atan2(desire.y, desire.x);
  }

  // If the attraction field is weak, simply keep the current heading.
  const desireStrength = Math.sqrt(desire.x * desire.x + desire.y * desire.y);
  if (desireStrength < 0.35) {
    targetAngle = beetle.angle;
  }

  (beetle as Beetle & { targetAngle: number; click: boolean }).targetAngle = wrapAngle(targetAngle);

  const shouldClick =
    bestClickOpportunity > WEIGHTS.clickThreshold &&
    beetle.size < WEIGHTS.clickSizeGate &&
    bestClickOpportunity > 0.08;

  (beetle as Beetle & { targetAngle: number; click: boolean }).click = shouldClick;
}

export { searchWeights };
