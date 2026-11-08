import { moduloAngle } from "../../shared/utils.js";
import type { Beetle } from "../entities/beetle.js";
import type { Projectile } from "../entities/projectile.js";
import type { Ruby } from "../entities/ruby.js";
import env from "../env.js";

function powerupTicksFeature(powerupTicks: null | number) {
    if(powerupTicks === null) return -1;
    if(powerupTicks >= 50) return 2;
    return powerupTicks / 50;
}

export const numFeatures = 177;

const numPointDensityRotations = 12;
const numPointDensityDistances = 4;
const pointDistanceFieldSize = 10;
const numRays = 12;

const aggressiveObstacleRay = 0;
const beetleRay = 1;
const safeObstacleRay = 2;
const rubyRay = 3;
const nothingRay = 4;
const numRayTypes = 5;

function rayCircleIntersection(ox: number, oy: number, dx: number, dy: number, cx: number, cy: number, radius: number) {
    const rx = ox - cx;
    const ry = oy - cy;

    const b = 2 * (rx * dx + ry * dy);
    const c = rx * rx + ry * ry - radius * radius;
    const disc = b * b - 4 * c;

    if (disc < 0) return Infinity;

    const sqrtDisc = Math.sqrt(disc);
    const t1 = (-b - sqrtDisc) * 0.5;
    const t2 = (-b + sqrtDisc) * 0.5;

    if (t1 >= 0) return t1;
    if (t2 >= 0) return t2;
    return Infinity;
}
function rayLineSegmentIntersection(ox: number, oy: number, dx: number, dy: number, x1: number, y1: number, x2: number, y2: number) {
    const sx = x2 - x1;
    const sy = y2 - y1;

    const det = dx * sy - dy * sx;
    if (Math.abs(det) < 1e-9) return Infinity;

    const rx = x1 - ox;
    const ry = y1 - oy;

    const t = (rx * sy - ry * sx) / det;
    const u = (rx * dy - ry * dx) / det;

    if (t >= 0 && u >= 0 && u <= 1) {
        return t;
    }

    return Infinity;
}
function rayCapsuleIntersection(ox: number, oy: number, dx: number, dy: number, x1: number, y1: number, x2: number, y2: number, radius: number) {
    let best = Infinity;

    best = Math.min(best,
        rayCircleIntersection(ox, oy, dx, dy, x1, y1, radius),
        rayCircleIntersection(ox, oy, dx, dy, x2, y2, radius)
    );

    const lx = x2 - x1;
    const ly = y2 - y1;
    const len = Math.hypot(lx, ly);

    if (len < 1e-9)
        return best;

    const nx = -ly / len;
    const ny = lx / len;

    for (const s of [-1, 1]) {
        const ax = x1 + s * radius * nx;
        const ay = y1 + s * radius * ny;
        const bx = x2 + s * radius * nx;
        const by = y2 + s * radius * ny;

        const t = rayLineSegmentIntersection(ox, oy, dx, dy, ax, ay, bx, by);
        if (t < best)
            best = t;
    }

    return best;
}

const mapSize = parseInt(env('VITE_MAP_SIZE'));

export function getFeatures(beetle: Beetle) {
    // rays - obstacle/safe obstacle/ruby/beetle and its distance

    const bvx = Math.cos(beetle.angle);
    const bvy = Math.sin(beetle.angle);

    const features = new Float32Array(numFeatures);
    let k = 0;

    const posNorm = Math.hypot(beetle.x, beetle.y);
    const sizeFrac = (4 - beetle.size) / 3;
    features[k++] = beetle.score + sizeFrac * 150;
    // features[k++] = beetle.rubyHits;
    features[k++] = posNorm;
    features[k++] = beetle.size;
    features[k++] = beetle.vx * bvx + beetle.vy * bvy;
    features[k++] = beetle.vx * bvy - beetle.vy * bvx;
    features[k++] = (beetle.x * bvx + beetle.y * bvy) / posNorm;
    features[k++] = (beetle.x * bvy - beetle.y * bvx) / posNorm;
    features[k++] = powerupTicksFeature(beetle.powerupTicks);
    features[k++] = beetle.powerupNumber;
    features[k++] = beetle.freezedTicks;

    let closestProjectile: Projectile | null = null;
    let closestProjectileDistance = 1e9;
    beetle.game.projectiles.forEach(projectile => {
        const dist = Math.hypot(projectile.x - beetle.x, projectile.y - beetle.y);
        if(dist < closestProjectileDistance) {
            closestProjectile = projectile;
            closestProjectileDistance = dist;
        }
    });
    if(closestProjectileDistance < 40) {
        closestProjectile = closestProjectile as any as Projectile;
        const rx = closestProjectile.x - beetle.x;
        const ry = closestProjectile.y - beetle.y;
        const vx = closestProjectile.vx;
        const vy = closestProjectile.vy;
        features[k++] = rx * bvx + ry * bvy;
        features[k++] = rx * bvy - ry * bvx;
        features[k++] = vx * bvx + vy * bvy;
        features[k++] = vx * bvy - vy * bvx;
    } else {
        for(let j = 0; j < 4; j ++) {
            features[k++] = 0;
        }
    }

    const rubyList: [Ruby, number][] = [];
    beetle.game.rubys.forEach(ruby => {
        const dist = Math.hypot(ruby.x - beetle.x, ruby.y - beetle.y);
        if(dist < 40) return;
        rubyList.push([ruby, dist]);
    });
    rubyList.sort((a, b) => a[1] - b[1]);
    if(rubyList.length == 0) {
        for(let j = 0; j < 10; j ++) {
            features[k++] = 0;
        }
    } else {
        for(let i = 0; i < 2; i ++) {
            const ruby = rubyList.length == 1 ? rubyList[0][0] : rubyList[i][0];
            const rx = ruby.x - beetle.x;
            const ry = ruby.y - beetle.y;
            features[k++] = rx * bvx + ry * bvy;
            features[k++] = rx * bvy - ry * bvx;
            features[k++] = ruby.baseSize;
            features[k++] = ruby.hp;
            features[k++] = ruby.protectionTicks;
        }
    }

    const beetleList: [Beetle, number][] = [];
    beetle.game.beetles.forEach(other => {
        if(other == beetle) return;
        const dist = Math.hypot(other.x - beetle.x, other.y - beetle.y);
        if(dist < 40) return;
        beetleList.push([other, dist]);
    });
    beetleList.sort((a, b) => a[1] - b[1]);
    for(let i = 0; i < 3; i ++) {
        if(i >= beetleList.length) {
            for(let j = 0; j < 11; j ++) {
                features[k++] = 0;
            }
            continue;
        }
        const other = beetleList[i][0];
        const rx = other.x - beetle.x;
        const ry = other.y - beetle.y;
        if(Math.hypot(rx, ry) + beetle.size + other.size > 24) {
            for(let j = 0; j < 11; j ++) {
                features[k++] = 0;
            }
            continue;
        }
        const vx = other.vx;
        const vy = other.vy;
        const ax = Math.cos(other.angle);
        const ay = Math.sin(other.angle);
        features[k++] = other.size;
        features[k++] = rx * bvx + ry * bvy;
        features[k++] = rx * bvy - ry * bvx;
        features[k++] = vx * bvx + vy * bvy;
        features[k++] = vx * bvy - vy * bvx;
        features[k++] = ax * bvx + ay * bvy;
        features[k++] = ax * bvy - ay * bvx;
        features[k++] = powerupTicksFeature(other.powerupTicks);
        features[k++] = other.powerupNumber;
        features[k++] = other.score;
        features[k++] = other.freezedTicks;
    }

    const pmult = numPointDensityRotations / (Math.PI * 2);
    beetle.game.points.forEach(point => {
        const rx = point.x - beetle.x;
        const ry = point.y - beetle.y;
        const d = Math.hypot(rx, ry);
        const fieldD = Math.floor(d / pointDistanceFieldSize);
        if(fieldD >= numPointDensityDistances) return;
        const a = moduloAngle(Math.atan2(ry, rx) - beetle.angle);
        const fieldA = Math.floor(a * pmult) % numPointDensityRotations;
        features[k + fieldA + fieldD * numPointDensityRotations] ++;
    });
    k += numPointDensityRotations * numPointDensityDistances;

    for(let rayId = 0; rayId < numRays; rayId ++) {
        const ox = beetle.x;
        const oy = beetle.y;
        const theta = beetle.angle + Math.PI * 2 * (rayId / numRays);
        const dx = Math.cos(theta);
        const dy = Math.sin(theta);

        let hitDistance = mapSize * 2;
        let hitType = aggressiveObstacleRay;

        const t = rayCircleIntersection(ox, oy, dx, dy, 0, 0, mapSize);
        if (t < hitDistance) {
            hitDistance = t;
            hitType = aggressiveObstacleRay;
        }

        beetle.game.beetles.forEach(other => {
            if(other == beetle) return;
            const t = rayCircleIntersection(ox, oy, dx, dy, other.x, other.y, other.size + beetle.size);

            if (t < hitDistance) {
                hitDistance = t;
                hitType = beetleRay;
            }
        });

        beetle.game.rubys.forEach(ruby => {
            const t = rayCircleIntersection(ox, oy, dx, dy, ruby.x, ruby.y, ruby.getSize() + beetle.size);

            if (t < hitDistance) {
                hitDistance = t;
                hitType = rubyRay;
            }
        });

        beetle.game.obstacles.forEach(obstacle => {
            const t = obstacle.isCircle 
            ? rayCircleIntersection(
                ox, oy, dx, dy,
                obstacle.x1, obstacle.y1,
                obstacle.getSize() + beetle.size
            ) : rayCapsuleIntersection(
                ox, oy, dx, dy,
                obstacle.x1, obstacle.y1,
                obstacle.x2, obstacle.y2,
                obstacle.getSize() + beetle.size
            );

            if (t < hitDistance) {
                hitDistance = t;
                hitType = obstacle.isAggressive ? aggressiveObstacleRay : safeObstacleRay;
            }
        });

        if(hitDistance > 24) {
            hitDistance = 24;
            hitType = nothingRay;
        }

        features[k++] = hitDistance;
        for(let j = 0; j < numRayTypes; j ++) {
            features[k++] = hitType == j ? 1 : 0;
        }
    }

    if(k != numFeatures) {
        throw Error(`Expected k to be ${numFeatures} at the end of writing features, but got ${k}`);
    }

    return features;
}

export function getFeaturesList(beetles: Beetle[]): [Float32Array, Int32Array] {
    const features = new Float32Array(numFeatures * beetles.length);
    const lifetimeTicks = new Int32Array(beetles.length);
    
    for(let i = 0; i < beetles.length; i ++) {
        features.set(getFeatures(beetles[i]), i * numFeatures);
        lifetimeTicks[i] = beetles[i].lifetimeTicks;
    }

    return [features, lifetimeTicks];
}
