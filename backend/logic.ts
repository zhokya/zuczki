import type { Beetle } from "../shared/types.ts";
import { angleDifference, rotateAngleTowards, samplePointInCircle } from "../shared/utils.ts";
import env from "./env.ts";
import type { Game } from "./game.ts";

const baseSpeed = 0.35;
const sizeIncreaseSpeed = 0.001;
const vectorDecay = 0.9;
const infSum = 1 - vectorDecay;
const irrelevanceTicks = 40;
const minPossibleSize = 0.75;
/**
 * by dividing by the sum of infinite geometric series vectorDecay^0 + vectorDecay^1 + vectorDecay^2 + ...
 * we can express each magnitude as the total delta it will cause:
 */
const vectorMagnitudes = {
    beetleCollision: { size: 0.5 * infSum, position: 6 * infSum },
    mapEdgeCollision: { size: 0.3 * infSum, position: 5 * infSum },
    click: { size: 0.1 * infSum, position: 8 * infSum },
    ruby: { size: -1.5 * infSum, position: 30 * infSum }  // scaled by fraction of hp taken
};
const beetleCollisionAngleZeroPoint = 0.25;
const magnitude1 = 0.12;
const magnitude2 = 0.005;
const maxDashDirectionChange = Math.PI / 5;
export const rubyProtectionTicks = 30;
const rubyVectorMagnitude = 0.1;
const maxSize = parseFloat(env('VITE_MAX_SIZE'));
const pointEatingMargin = 2;
const pointCreationMargin = 4;

const mapSize = parseInt(env('VITE_MAP_SIZE'));
const targetNumPoints = parseFloat(env('TARGET_POINT_DENSITY')) * Math.PI * mapSize * mapSize;

export function initializeBeetle(id: string, isBot: boolean): Beetle {
    // TODO: check for collisions before initializing position
    // also consider other initializations, like uniform of circle
    const [x, y] = samplePointInCircle(mapSize - 5);
    const initialAngle = Math.random() * Math.PI * 2;

    return {
        x: x,
        y: y,
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
        lastBrainActive: isBot ? -1e9 : performance.now()
    };
}

function shiftX(x: number, zeroPoint: number) {
    return (x - zeroPoint) / (1 - zeroPoint * x);
}
function getHitQuality(dot: number) {
    // dot is the cosine of the angle (dot product of normalized vectors)
    const scaledAngle = 1 - Math.acos(dot) * 2 / Math.PI;
    return shiftX(scaledAngle, beetleCollisionAngleZeroPoint);
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
    // Remove points first, so that there are no points that are created and removed in the same tick
    game.beetles.forEach(b => {
        game.points.forEach((point, id) => {
            const dx = b.x - point[0];
            const dy = b.y - point[1];
            if (dx * dx + dy * dy < b.size * b.size * pointEatingMargin) {
                b.score++;
                game.pointIdRemovals.push({
                    id: id,
                    animation: [b.x - dx * 0.7, b.y - dy * 0.7]
                });
                if (point[2]) {
                    game.numBeetleDeathPoints--;
                } else {
                    game.numEnvironmentDensityPoints--;
                }
                game.points.delete(id);
            }
        });
    });

    // Handle beetles
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

        // Handle death
        if (b.size > maxSize) {
            let numPoints = Math.floor(b.score * 0.9);

            if (numPoints > 40) {
                if (Math.random() < numPoints / 200) {
                    numPoints -= 80;
                    game.rubyId.next();
                    game.rubys.set(game.rubyId.id, {
                        id: game.rubyId.id,
                        x: b.x,
                        y: b.y,
                        vx: Math.cos(b.angle) * 1 * infSum,
                        vy: Math.sin(b.angle) * 1 * infSum,
                        hp: 1,
                        baseSize: Math.random() * 0.8 + 0.8,
                        protectionTicks: rubyProtectionTicks
                    });
                }
            }

            if (numPoints > 100) {
                numPoints = 100 + 5 * Math.sqrt(numPoints - 100);
            }

            for (let i = 0; i < Math.max(0, numPoints) + 10; i++) {
                const [px, py] = samplePointInCircle(b.size);
                game.pointId.next();
                game.numBeetleDeathPoints++;
                game.points.set(game.pointId.id, [px + b.x, py + b.y, true]);
                game.pointIdCreations.push(game.pointId.id);
            }

            game.beetles.delete(b.id);

            return;
        }

        // Collision with world edge
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

        // Dashing
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

        // Interactions with other beetles
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

                const qualityB = getHitQuality(Math.cos(b.angle) * (-ndx) + Math.sin(b.angle) * (-ndy));
                const qualityO = getHitQuality(Math.cos(o.angle) * ndx + Math.sin(o.angle) * ndy);

                const scoreB = qualityO - (qualityB > 0 ? qualityB : 0);
                const scoreO = qualityB - (qualityO > 0 ? qualityO : 0);

                b.vx -= vectorMagnitudes.beetleCollision.position * ndx;
                b.vy -= vectorMagnitudes.beetleCollision.position * ndy;
                b.vsize -= vectorMagnitudes.beetleCollision.size * scoreB;
                b.score += Math.max(0, Math.round(67.4 * scoreB));

                o.vx += vectorMagnitudes.beetleCollision.position * ndx;
                o.vy += vectorMagnitudes.beetleCollision.position * ndy;
                o.vsize -= vectorMagnitudes.beetleCollision.size * scoreO;
                o.score += Math.max(0, Math.round(67.4 * scoreO));
            }
        });
    });

    // Handle rubys
    game.rubys.forEach(r => {
        // Collision with beetles
        // Many beetles can collide in the same tick, so we handle all of them at once to be fair
        let removeRuby = false;
        let applyProtection = false;
        let totalHpTaken = 0;
        game.beetles.forEach(b => {
            const dx = r.x - b.x;
            const dy = r.y - b.y;
            const ds = r.baseSize * r.hp + b.size;

            if (dx * dx + dy * dy <= ds * ds) {
                const norm = Math.sqrt(dx * dx + dy * dy);
                const ndx = dx / norm;
                const ndy = dy / norm;

                b.x -= ndx * (ds - norm);
                b.y -= ndy * (ds - norm);

                if (r.protectionTicks > 0) return;

                let hp = Math.random() * 0.35 + 0.05;

                if (r.hp - hp < 0.15) {
                    removeRuby = true;
                    hp = r.hp;
                } else {
                    r.vx += ndx * rubyVectorMagnitude;
                    r.vy += ndx * rubyVectorMagnitude;
                    applyProtection = true;
                    totalHpTaken += hp;
                }

                b.vx -= ndx * vectorMagnitudes.ruby.position * hp;
                b.vy -= ndy * vectorMagnitudes.ruby.position * hp;
                b.vsize += vectorMagnitudes.ruby.size * hp;
                b.score += Math.round(hp * 100);
            }
        });

        if (removeRuby) {
            game.rubys.delete(r.id);
            return;
        }
        if (applyProtection) {
            r.protectionTicks = rubyProtectionTicks;
        }
        r.hp -= totalHpTaken;

        r.x += r.vx;
        r.y += r.vy;
        r.vx *= vectorDecay;
        r.vy *= vectorDecay;
        r.protectionTicks = Math.max(0, r.protectionTicks - 1);

        // Collision with world edge
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

    for (let i = 0; i < Math.ceil((targetNumPoints - game.numEnvironmentDensityPoints) * 0.1); i++) {
        const [x, y] = samplePointInCircle(mapSize - 2);
        let isCorrect = true;
        game.beetles.forEach(b => {
            const dx = b.x - x;
            const dy = b.y - y;
            if (dx * dx + dy * dy < b.size * b.size * pointCreationMargin) {
                isCorrect = false;
            }
        });
        if (isCorrect) {
            game.pointId.next();
            game.numEnvironmentDensityPoints++;
            game.points.set(game.pointId.id, [x, y, false]);
            game.pointIdCreations.push(game.pointId.id);
        }
    }
}
