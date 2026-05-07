type AnyGame = any;
type AnyBeetle = any;

const TAU = Math.PI * 2;
const MAP_SIZE_FALLBACK = 67;
const DASH_COOLDOWN_TICKS = 20;
const EDGE_SOFT_ZONE = 16;
const EDGE_HARD_ZONE = 8;
const POINT_RADIUS = 34;
const RUBY_RADIUS = 48;
const ATTACK_RADIUS = 30;

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function hashString(str: string): number {
  // FNV-1a
  let h = 2166136261 >>> 0;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
}

export function updateBot(game: AnyGame, beetle: AnyBeetle) {
  const state = beetle as AnyBeetle & {
    _botTick?: number;
    _lastDashTick?: number;
    _orbitDir?: number;
    _idHash?: number;
  };

  state._botTick = (state._botTick ?? 0) + 1;
  if (state._idHash == null) state._idHash = hashString(String(beetle.id ?? ""));
  if (state._orbitDir == null) state._orbitDir = (state._idHash & 1) ? 1 : -1;

  const mapSize = typeof game.mapSize === "number" ? game.mapSize : MAP_SIZE_FALLBACK;
  const size = typeof beetle.size === "number" ? beetle.size : 1;
  const x = beetle.x as number;
  const y = beetle.y as number;

  const centerDist = Math.hypot(x, y);
  const safeRadius = Math.max(8, mapSize - size - 1.25);
  const edgeDist = safeRadius - centerDist;
  const urgency = clamp((size - 1) / 3, 0, 1);

  let desiredX = 0;
  let desiredY = 0;
  let desiredWeight = 0;

  let bestRubyUtility = 0;
  let bestRubyDist = Infinity;
  let bestAttackUtility = 0;
  let bestAttackDist = Infinity;

  const inwardX = centerDist > 1e-6 ? -x / centerDist : 0;
  const inwardY = centerDist > 1e-6 ? -y / centerDist : 0;
  const tangentX = -inwardY * (state._orbitDir ?? 1);
  const tangentY = inwardX * (state._orbitDir ?? 1);

  // Always keep moving a little: orbit around the center, but bias inward when needed.
  // This prevents the bot from getting stuck in place when no good target is nearby.
  {
    const patrol = 0.55 + 0.7 * (1 - urgency);
    desiredX += inwardX * patrol + tangentX * 0.22;
    desiredY += inwardY * patrol + tangentY * 0.22;
    desiredWeight += patrol;
  }

  // Strong edge avoidance.
  if (edgeDist < EDGE_SOFT_ZONE) {
    const t = clamp((EDGE_SOFT_ZONE - edgeDist) / EDGE_SOFT_ZONE, 0, 1);
    const push = (12 + 10 * urgency) * t * t;
    desiredX += inwardX * push;
    desiredY += inwardY * push;
    desiredWeight += push;
  }

  // Collect points that are close enough to matter.
  for (const p of game.points.values()) {
    const px = p[0] as number;
    const py = p[1] as number;
    const dx = px - x;
    const dy = py - y;
    const dist2 = dx * dx + dy * dy;
    if (dist2 > POINT_RADIUS * POINT_RADIUS) continue;

    const dist = Math.sqrt(dist2) + 1e-6;
    const weight = (18 * (1 - 0.55 * urgency)) / (dist2 + 10);
    if (weight <= 0) continue;

    desiredX += (dx / dist) * weight;
    desiredY += (dy / dist) * weight;
    desiredWeight += weight;
  }

  // Rubies are the best way to reduce size and score lots of points.
  for (const ruby of game.rubys.values()) {
    if ((ruby.protectionTicks ?? 0) > 0) continue;

    const dx = ruby.x - x;
    const dy = ruby.y - y;
    const dist2 = dx * dx + dy * dy;
    if (dist2 > RUBY_RADIUS * RUBY_RADIUS) continue;

    const dist = Math.sqrt(dist2) + 1e-6;
    const hpFactor = 0.7 + 1.6 * clamp(ruby.hp ?? 0.3, 0.05, 1);
    const utility = (55 * (0.55 + 1.5 * urgency) * hpFactor) / (dist2 + 18);
    if (utility <= 0) continue;

    desiredX += (dx / dist) * utility;
    desiredY += (dy / dist) * utility;
    desiredWeight += utility;

    if (utility > bestRubyUtility) {
      bestRubyUtility = utility;
      bestRubyDist = dist;
    }
  }

  // Attack other beetles from the back. Prefer targets we are already well-positioned for.
  for (const other of game.beetles.values()) {
    if (!other || other.id === beetle.id) continue;

    const dx = other.x - x;
    const dy = other.y - y;
    const dist2 = dx * dx + dy * dy;
    if (dist2 > ATTACK_RADIUS * ATTACK_RADIUS) continue;

    const dist = Math.sqrt(dist2) + 1e-6;
    const ndx = dx / dist;
    const ndy = dy / dist;
    const ofx = Math.cos(other.angle);
    const ofy = Math.sin(other.angle);

    // rearDot > 0 means we are roughly behind the other beetle.
    const rearDot = ndx * ofx + ndy * ofy;
    // approach > 0 means the other beetle is facing toward us.
    const approach = (-ndx) * ofx + (-ndy) * ofy;
    const closeness = clamp((ATTACK_RADIUS - dist) / ATTACK_RADIUS, 0, 1);
    const sizeRatio = (size + 0.35) / (other.size + 0.35);
    const aggression = clamp(sizeRatio, 0.55, 1.7);

    const backOffset = other.size + size + 1.0;
    const backX = other.x - ofx * backOffset;
    const backY = other.y - ofy * backOffset;
    const toBackX = backX - x;
    const toBackY = backY - y;
    const toBackDist = Math.hypot(toBackX, toBackY) + 1e-6;

    const align = clamp((rearDot + 0.15) / 1.15, 0, 1);
    const attackUtility = 42 * closeness * align * aggression / (toBackDist + 8);

    desiredX += (toBackX / toBackDist) * attackUtility;
    desiredY += (toBackY / toBackDist) * attackUtility;
    desiredWeight += attackUtility;

    // Repel from dangerous head-on or side collisions.
    const danger = 18 * closeness * clamp((0.1 - rearDot) / 0.7, 0, 1) * (other.size >= size ? 1.1 : 0.8);
    if (danger > 0) {
      desiredX -= ndx * danger;
      desiredY -= ndy * danger;
      desiredWeight += danger;
    }

    const faceDanger = 10 * closeness * clamp(approach, 0, 1);
    if (faceDanger > 0) {
      desiredX -= ndx * faceDanger;
      desiredY -= ndy * faceDanger;
      desiredWeight += faceDanger;
    }

    if (attackUtility > bestAttackUtility) {
      bestAttackUtility = attackUtility;
      bestAttackDist = dist;
    }
  }

  // If we are too close to the rim, force a much stronger inward bias.
  if (edgeDist < EDGE_HARD_ZONE) {
    desiredX = desiredX * 0.35 + inwardX * 20;
    desiredY = desiredY * 0.35 + inwardY * 20;
  }

  if (desiredWeight < 1e-6) {
    desiredX = inwardX;
    desiredY = inwardY;
  }

  // Tiny deterministic jitter helps break symmetry when the field is flat.
  const jitter = (((state._idHash ?? 0) ^ (state._botTick ?? 0)) % 97) / 97;
  desiredX += Math.cos(jitter * TAU) * 0.02;
  desiredY += Math.sin(jitter * TAU) * 0.02;

  beetle.targetAngle = Math.atan2(desiredY, desiredX);

  // Dash decisions:
  // 1) a good back-hit opportunity is available,
  // 2) we are very large and a ruby is close,
  // 3) we are near the edge and need to escape now.
  const canDash = (state._botTick ?? 0) - (state._lastDashTick ?? -9999) > DASH_COOLDOWN_TICKS;
  let shouldDash = false;

  if (canDash && bestAttackUtility > 0.45 && bestAttackDist < 16 + size * 2) {
    shouldDash = true;
  }

  if (!shouldDash && canDash && urgency > 0.82 && bestRubyUtility > 0.05 && bestRubyDist < 18 && edgeDist > 5) {
    shouldDash = true;
  }

  if (!shouldDash && canDash && edgeDist < 4) {
    shouldDash = true;
  }

  beetle.click = shouldDash;
  (beetle as any).clicked = shouldDash;
  if (shouldDash) state._lastDashTick = state._botTick;
}
