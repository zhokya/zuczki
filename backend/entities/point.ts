import { samplePointInCircle } from "../../shared/utils.js";
import type { Game } from "../game.js";
import type { Beetle } from "./beetle.js";

const pointEatingMargin = 2.5;
const pointCreationMargin = 6;

export class Point {
    id: number;
    x: number;
    y: number;
    isEnv: boolean;
    game: Game;

    constructor(x: number, y: number, isEnv: boolean, game: Game) {
        this.id = game.pointId.next();
        this.game = game;

        this.x = x;
        this.y = y;
        this.isEnv = isEnv;

        game.pointCreations.push({ id: this.id, x, y });
        if (isEnv) {
            game.numEnvironmentDensityPoints++;
        } else {
            game.numBeetleDeathPoints++;
        }
    }

    handleEating(beetle: Beetle): boolean {
        const dx = this.x - beetle.x;
        const dy = this.y - beetle.y;

        if (dx * dx + dy * dy > beetle.size * beetle.size * pointEatingMargin) return false;

        beetle.score++;

        this.game.pointRemovals.push({
            id: this.id,
            x: beetle.x + dx * 0.5,
            y: beetle.y + dy * 0.5
        });
        if (this.isEnv) {
            this.game.numEnvironmentDensityPoints--;
        } else {
            this.game.numBeetleDeathPoints--;
        }

        this.game.pointId.unregister(this.id);

        return true;
    }
}

const targetPointDensity = 0.05;
export function spawnNewPoints(game: Game, numPointsMultiplier: number = 1) {
    const targetNumPoints = targetPointDensity * Math.PI * game.mapSize * game.mapSize;

    for (let i = 0; i < Math.ceil((targetNumPoints * numPointsMultiplier - game.numEnvironmentDensityPoints) * 0.1); i++) {
        const [x, y] = samplePointInCircle(game.mapSize - 2);
        let isCorrect = true;
        game.beetles.forEach(b => {
            const dx = b.x - x;
            const dy = b.y - y;
            if (dx * dx + dy * dy < b.size * b.size * pointCreationMargin) {
                isCorrect = false;
            }
        });
        if (isCorrect) {
            const point = new Point(x, y, true, game);
            game.points.set(point.id, point);
        }
    }
}
