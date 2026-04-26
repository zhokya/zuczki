import type { Beetle } from "../shared/types.ts";
import env from "./env.ts";

export function initializeBeetle(id: string, isBot: boolean): Beetle {
    // TODO: check for collisions before initializing position
    // also consider other initializations, like uniform of circle
    const initialPositionRadius = Math.random() * parseInt(env('MAP_SIZE'));
    const initialPositionAngle = Math.random() * Math.PI * 2;
    const initialAngle = Math.random() * Math.PI * 2;

    return {
        x: initialPositionRadius * Math.cos(initialPositionAngle),
        y: initialPositionRadius * Math.sin(initialPositionAngle),
        angle: initialAngle,
        size: 20,
        score: 0,
        vectors: [],

        targetAngle: initialAngle,
        clicked: false,

        id: id,
        lastBrainActive: isBot ? -1 : performance.now()
    };
}

export function updateGameLogic() {

}
