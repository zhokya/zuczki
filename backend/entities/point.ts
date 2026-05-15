import { samplePointInCircle } from "../../shared/utils.js";
import env from "../env.js";
import type { Game } from "../game.js";
import type { Beetle } from "./beetle.js";

const pointEatingMargin = 2.5;
const pointCreationMargin = 6;
const mapSize = parseInt(env('VITE_MAP_SIZE'));
const targetNumPoints = parseFloat(env('TARGET_POINT_DENSITY')) * Math.PI * mapSize * mapSize;

export class Point {
    id: number;
    x: number;
    y: number;
    isEnv: boolean;
    game: Game;

    constructor(id: number, x: number, y: number, isEnv: boolean, game: Game) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.isEnv = isEnv;
        this.game = game;

        game.pointIdCreations.push(id);
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

        this.game.pointIdRemovals.push({
            id: this.id,
            animation: [beetle.x + dx * 0.5, beetle.y + dy * 0.5]
        });
        if (this.isEnv) {
            this.game.numEnvironmentDensityPoints--;
        } else {
            this.game.numBeetleDeathPoints--;
        }

        return true;
    }
}

export function spawnNewPoints(game: Game) {
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
            game.points.set(game.pointId.id, new Point(game.pointId.id, x, y, true, game));
        }
    }
}
