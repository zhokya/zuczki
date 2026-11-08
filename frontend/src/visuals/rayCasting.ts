import type { Beetle } from "../entities/beetle";
import type { Obstacle } from "../entities/obstacle";
import type { Ruby } from "../entities/ruby";
import type { RenderInfo } from "../renderInfo";

const numRays = 12;
const mapSize = import.meta.env.VITE_MAP_SIZE;
const aggressiveObstacleRay = 'red';
const beetleRay = 'blue';
const rubyRay = 'pink';
const safeObstacleRay = 'gray';

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

export function renderRaycasting(
    renderInfo: RenderInfo,
    beetle: Beetle | undefined,
    beetles: Map<number, Beetle>,
    rubys: Map<number, Ruby>,
    obstacles: Map<number, Obstacle>
) {
    if(beetle === undefined) return;
    
    const { ctx } = renderInfo;
    ctx.lineWidth = 0.1;

    for (let rayId = 0; rayId < numRays; rayId++) {
        const ox = beetle.x.value;
        const oy = beetle.y.value;
        const theta = beetle.angle.value + Math.PI * 2 * (rayId / numRays);
        const dx = Math.cos(theta);
        const dy = Math.sin(theta);

        let hitDistance = mapSize * 2;
        let hitType = aggressiveObstacleRay;

        const t = rayCircleIntersection(ox, oy, dx, dy, 0, 0, mapSize);
        if (t < hitDistance) {
            hitDistance = t;
            hitType = aggressiveObstacleRay;
        }

        beetles.forEach(other => {
            if (other == beetle) return;
            const t = rayCircleIntersection(ox, oy, dx, dy, other.x.value, other.y.value, other.size.value);

            if (t < hitDistance) {
                hitDistance = t;
                hitType = beetleRay;
            }
        });

        rubys.forEach(ruby => {
            const t = rayCircleIntersection(ox, oy, dx, dy, ruby.x.value, ruby.y.value, ruby.baseSize * ruby.visibleHp);

            if (t < hitDistance) {
                hitDistance = t;
                hitType = rubyRay;
            }
        });

        obstacles.forEach(obstacle => {
            const t = obstacle.isCircle
                ? rayCircleIntersection(
                    ox, oy, dx, dy,
                    obstacle.x1.value, obstacle.y1.value,
                    obstacle.size.value
                ) : rayCapsuleIntersection(
                    ox, oy, dx, dy,
                    obstacle.x1.value, obstacle.y1.value,
                    obstacle.x2.value, obstacle.y2.value,
                    obstacle.size.value
                );

            if (t < hitDistance) {
                hitDistance = t;
                hitType = obstacle.isAggressive ? aggressiveObstacleRay : safeObstacleRay;
            }
        });

        ctx.strokeStyle = hitType;
        ctx.beginPath();
        ctx.moveTo(ox, oy);
        ctx.lineTo(ox + hitDistance * dx, oy + hitDistance * dy);
        ctx.stroke();
    }
}
