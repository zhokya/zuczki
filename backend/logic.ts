import type { Beetle } from "../shared/types.ts";
import { angleDifference, rotateAngleTowards, samplePointInCircle } from "../shared/utils.ts";
import env from "./env.ts";
import type { Game } from "./game.ts";

const baseSpeed = 0.35;
const sizeIncreaseSpeed = 0.001;
const vectorDecay = 0.92;
const irrelevanceTicks = 40;
const minPossibleSize = 0.75;
const vectorMagnitudes = {
    beetleCollision: { size: 0.04, position: 0.6 },
    mapEdgeCollision: { size: 0.03, position: 0.5 },
    click: { size: 0.001, position: 0.65 },
    ruby: { size: -0.1, position: 3 }  // scaled by fraction of hp taken
};
const magnitude1 = 0.12;
const magnitude2 = 0.01;
const maxDashDirectionChange = Math.PI / 5;
export const rubyProtectionTicks = 15;
const rubyVectorMagnitude = 0.1;

const mapSize = parseInt(env('VITE_MAP_SIZE'));
const targetNumPoints = parseFloat(env('TARGET_POINT_DENSITY')) * Math.PI * mapSize * mapSize;

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

function getHitQuality(dot: number) {
    return 1 - Math.acos(dot) / Math.PI * 2;
}

(() => {
    const numTicks = 10000;

    let x = 0;
    let vx = 0;
    for (let i = 0; i < numTicks; i++) {
        const speed = baseSpeed * Math.max(0, Math.min(1, (vx - magnitude1) / (magnitude2 - magnitude1)));
        x += speed + vx;
        vx *= vectorDecay;
        if (vx < magnitude1) {
            vx += vectorMagnitudes.click.position;
        }
    }

    console.log('Speed without clicking: ' + baseSpeed.toFixed(4));
    console.log('Speed with constant clicking: ' + (x / numTicks).toFixed(4));
})();

export function updateGameLogic(game: Game) {
    game.beetles.forEach(b => {
        const pointEatingMargin = 2;

        game.points.forEach((pos, id) => {
            const dx = b.x - pos[0];
            const dy = b.y - pos[1];
            if (dx * dx + dy * dy < b.size * b.size * pointEatingMargin) {
                b.score++;
                game.pointIdRemovals.push({
                    id: id,
                    animation: [b.x - dx * 0.7, b.y - dy * 0.7]
                });
                game.points.delete(id);
            }
        });
    });

    game.beetles.forEach(b => {
        const magnitude = Math.sqrt(b.vx * b.vx + b.vy * b.vy);

        const rotationSpeed = 0.12 / b.size;
        const speed = baseSpeed * Math.max(0, Math.min(1, (magnitude - magnitude1) / (magnitude2 - magnitude1)));

        b.angle = rotateAngleTowards(b.angle, b.targetAngle, rotationSpeed);

        b.x += speed * Math.cos(b.angle) + b.vx;
        b.y += speed * Math.sin(b.angle) + b.vy;
        b.size = Math.max(minPossibleSize, b.size + sizeIncreaseSpeed + b.vsize);

        b.vx *= vectorDecay;
        b.vy *= vectorDecay;
        b.vsize *= vectorDecay;

        if (b.size > 4) {
            let numPoints = Math.floor(b.score * 0.9);

            if (numPoints > 40) {
                if (Math.random() < numPoints / 200) {
                    numPoints -= 80;
                    game.currentRubyId = (game.currentRubyId + 1) % 1000000000;
                    game.rubys.set(game.currentRubyId, {
                        id: game.currentRubyId,
                        x: b.x,
                        y: b.y,
                        vx: Math.cos(b.angle) * 0.05,
                        vy: Math.sin(b.angle) * 0.05,
                        hp: 1,
                        baseSize: Math.random() * 0.5 + 0.3,
                        protectionTicks: rubyProtectionTicks
                    });
                }
            }

            if(numPoints > 100) {
                numPoints = 100 + 5 * Math.sqrt(numPoints - 100);
            }

            for (let i = 0; i < Math.max(0, numPoints) + 10; i++) {
                const [px, py] = samplePointInCircle(b.size);
                game.currentPointId = (game.currentPointId + 1) % 1000000000;
                game.points.set(game.currentPointId, [px + b.x, py + b.y]);
                game.pointIdCreations.push(game.currentPointId);
            }

            game.beetles.delete(b.id);

            return;
        }

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
                    Math.min(angleDifference(b.angle, b.targetAngle), maxDashDirectionChange)
                );
                b.vx += Math.cos(jumpAngle) * vectorMagnitudes.click.position;
                b.vy += Math.sin(jumpAngle) * vectorMagnitudes.click.position;
                b.vsize += vectorMagnitudes.click.size;
            }
        }

        for (let i = b.irrelevants.length - 1; i >= 0; i--) {
            b.irrelevants[i].ticks++;
            if (b.irrelevants[i].ticks > irrelevanceTicks) {
                b.irrelevants.splice(i, 1);
            }
        }

        game.beetles.forEach(o => {
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

        game.rubys.forEach(r => {
            const dx = r.x - b.x;
            const dy = r.y - b.y;
            const ds = r.baseSize * r.hp + b.size;

            if (dx * dx + dy * dy <= ds * ds) {
                const norm = Math.sqrt(dx * dx + dy * dy);
                const ndx = dx / norm;
                const ndy = dy / norm;

                b.x -= ndx * (ds - norm) / 2;
                b.y -= ndy * (ds - norm) / 2;
                r.x += ndx * (ds - norm) / 2;
                r.y += ndy * (ds - norm) / 2;

                if (r.protectionTicks > 0) return;

                let hp = Math.random() * 0.35 + 0.05;

                if (r.hp - hp < 0.04) {
                    game.rubys.delete(r.id);
                    hp = r.hp;
                } else {
                    r.vx += ndx * rubyVectorMagnitude;
                    r.vy += ndx * rubyVectorMagnitude;
                    r.hp -= hp;
                    r.protectionTicks = rubyProtectionTicks;
                }

                b.vx -= ndx * vectorMagnitudes.ruby.position * hp;
                b.vy -= ndy * vectorMagnitudes.ruby.position * hp;
                b.vsize += vectorMagnitudes.ruby.size * hp;
                b.score += Math.round(hp * 100);
            }
        });
    });

    game.rubys.forEach(r => {
        r.x += r.vx;
        r.y += r.vy;
        r.vx *= vectorDecay;
        r.vy *= vectorDecay;
        r.protectionTicks = Math.max(0, r.protectionTicks - 1);

        const maxr = mapSize - r.baseSize * r.hp;
        if (r.x * r.x + r.y * r.y > maxr * maxr) {
            const norm = Math.sqrt(r.x * r.x + r.y * r.y);
            const normx = r.x / norm;
            const normy = r.y / norm;
            r.x = normx * maxr;
            r.y = normy * maxr;

            r.vx = -vectorMagnitudes.mapEdgeCollision.position * normx;
            r.vy = -vectorMagnitudes.mapEdgeCollision.position * normy;
        }
    });

    for (let i = 0; i < Math.ceil((targetNumPoints - game.points.size) * 0.1); i++) {
        if (game.points.size < targetNumPoints) {
            const pos = samplePointInCircle(mapSize - 2);
            let isCorrect = true;
            game.beetles.forEach(b => {
                const dx = b.x - pos[0];
                const dy = b.y - pos[1];
                if (dx * dx + dy * dy < b.size * b.size * 1.1) {
                    isCorrect = false;
                }
            });
            if (isCorrect) {
                game.currentPointId = (game.currentPointId + 1) % 1000000000;
                game.points.set(game.currentPointId, pos);
                game.pointIdCreations.push(game.currentPointId);
            }
        }
    }
}
