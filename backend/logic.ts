import type { Beetle } from "../shared/types.ts";
import { angleDifference, rotateAngleTowards } from "../shared/utils.ts";
import env from "./env.ts";
import { beetles } from "./manager.ts";

const mapSize = parseInt(env('VITE_MAP_SIZE'))

export function initializeBeetle(id: string, isBot: boolean): Beetle {
    // TODO: check for collisions before initializing position
    // also consider other initializations, like uniform of circle
    const initialPositionRadius = Math.random() * (mapSize - 4);
    const initialPositionAngle = Math.random() * Math.PI * 2;
    const initialAngle = Math.random() * Math.PI * 2;

    return {
        x: initialPositionRadius * Math.cos(initialPositionAngle),
        y: initialPositionRadius * Math.sin(initialPositionAngle),
        size: 1,
        angle: initialAngle,

        vx: 0,
        vy: 0,
        vsize: 0,

        score: 0,
        irrelevants: [],

        targetAngle: initialAngle,
        clicked: false,

        id: id,
        lastBrainActive: isBot ? -1 : performance.now()
    };
}

function getHitQuality(dot) {
    return 1 - Math.acos(dot) / Math.PI * 2;
}

export function updateGameLogic() {
    beetles.forEach(b => {
        const magnitude = Math.sqrt(b.vx * b.vx + b.vy * b.vy);
        const magnitude1 = 0.1;
        const magnitude2 = 0.01;

        const rotationSpeed = 0.1 / b.size;
        const speed = 0.3 * Math.max(0, Math.min(1, (magnitude - magnitude1) / (magnitude2 - magnitude1)));
        const sizeIncreaseSpeed = 0.001;
        const vectorDecay = 0.9;
        const irrelevanceTicks = 40;
        const minPossibleSize = 0.75;
        const vectorMagnitudes = {
            beetleCollision: { size: 0.0, position: 0.6 },  // 0.04
            mapEdgeCollision: { size: 0.0, position: 0.5 }   // 0.03
        }

        b.angle = rotateAngleTowards(b.angle, b.targetAngle, rotationSpeed);

        b.x += speed * Math.cos(b.angle) + b.vx;
        b.y += speed * Math.sin(b.angle) + b.vy;
        b.size = Math.max(minPossibleSize, b.size + sizeIncreaseSpeed + b.vsize);

        b.vx *= vectorDecay;
        b.vy *= vectorDecay;
        b.vsize *= vectorDecay;

        const maxr = mapSize - b.size;
        if (b.x * b.x + b.y * b.y > maxr * maxr) {
            const norm = Math.sqrt(b.x * b.x + b.y * b.y);
            const normx = b.x / norm;
            const normy = b.y / norm;
            b.x = normx * maxr;
            b.y = normy * maxr;

            b.vx = -vectorMagnitudes.mapEdgeCollision.position * normx;
            b.vy = -vectorMagnitudes.mapEdgeCollision.position * normy;
            b.vsize += vectorMagnitudes.mapEdgeCollision.size;
        }

        if (b.clicked) {
            b.clicked = false;
            if (magnitude < magnitude1) {
                const jumpAngle = rotateAngleTowards(
                    b.angle,
                    b.targetAngle,
                    angleDifference(b.angle, b.targetAngle) / 3
                );
                b.vx += Math.cos(jumpAngle);
                b.vy += Math.sin(jumpAngle);
            }
        }

        for (let i = b.irrelevants.length - 1; i >= 0; i--) {
            b.irrelevants[i].ticks++;
            if (b.irrelevants[i].ticks > irrelevanceTicks) {
                b.irrelevants.splice(i, 1);
            }
        }

        beetles.forEach(o => {
            if (o.id >= b.id) return;

            const dx = o.x - b.x;
            const dy = o.y - b.y;
            const ds = o.size + b.size;

            if (dx * dx + dy * dy <= ds * ds) {
                const norm = Math.sqrt(dx * dx + dy * dy);
                const ndx = dx / norm;
                const ndy = dy / norm;

                b.x -= ndx * (ds - norm) / 2;
                b.y -= ndy * (ds - norm) / 2;
                o.x += ndx * (ds - norm) / 2;
                o.y += ndy * (ds - norm) / 2;

                for (let i = b.irrelevants.length - 1; i >= 0; i--) {
                    if (b.irrelevants[i].id == o.id) return;
                }
                b.irrelevants.push({
                    id: o.id,
                    ticks: 0
                });

                b.vx -= vectorMagnitudes.beetleCollision.position * ndx;
                b.vy -= vectorMagnitudes.beetleCollision.position * ndy;
                const qo = getHitQuality(Math.cos(o.angle) * ndx + Math.sin(o.angle) * ndy);
                b.vsize -= vectorMagnitudes.beetleCollision.size * qo;
                b.score += Math.max(0, Math.round(67.4 * qo));

                o.vx += vectorMagnitudes.beetleCollision.position * ndx;
                o.vy += vectorMagnitudes.beetleCollision.position * ndy;
                const qb = getHitQuality(Math.cos(b.angle) * (-ndx) + Math.sin(b.angle) * (-ndy));
                o.vsize -= vectorMagnitudes.beetleCollision.size * qb;
                o.score += Math.max(0, Math.round(67.4 * qb));
            }
        });

        if (b.size > 4) {
            beetles.delete(b.id);
        }
    })
}
