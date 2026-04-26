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
        vx: 0,
        vy: 0,
        vsize: 0,
        angle: initialAngle,
        score: 0,

        targetAngle: initialAngle,
        clicked: false,

        id: id,
        lastBrainActive: isBot ? -1 : performance.now()
    };
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

        b.angle = rotateAngleTowards(b.angle, b.targetAngle, rotationSpeed);

        b.x += speed * Math.cos(b.angle) + b.vx;
        b.y += speed * Math.sin(b.angle) + b.vy;
        b.size += sizeIncreaseSpeed + b.vsize;

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

            b.vx = -0.5 * normx;
            b.vy = -0.5 * normy;
            b.vsize += 0.05;
        }

        if(b.clicked) {
            b.clicked = false;
            if(magnitude < magnitude1) {
                const jumpAngle = rotateAngleTowards(
                    b.angle, 
                    b.targetAngle, 
                    angleDifference(b.angle, b.targetAngle) / 3
                );
                b.vx += Math.cos(jumpAngle);
                b.vy += Math.sin(jumpAngle);
            }
        }

        if(b.size > 4) {
            beetles.delete(b.id);
        }
    })
}
