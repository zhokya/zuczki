import { Game } from "../game.ts";
import { updateGameLogic, initializeBeetle } from "../logic.ts";
import { generateId, moduloAngle } from "../../shared/utils.ts";
import type { Beetle, Ruby } from "../../shared/types.ts";

const baseSpeed = 0.35;
const sizeIncreaseSpeed = 0.001;
const vectorDecay = 0.9;
const beetleCollisionAngleZeroPoint = 0.25;
const rubyProtectionTicks = 30;
const maxSize = 4;
const mapSize = 67;
const pointEatingMargin = 2;

export function updateBot(game: Game, beetle: Beetle) {
    if (Math.random() < 0.005) {
        beetle.clicked = true;
    }
    let mx = 0;
    let my = 0;
    game.points.forEach(pos => {
        const dx = pos[0] - beetle.x;
        const dy = pos[1] - beetle.y;
        const imp = (160 - (dx * dx + dy * dy)) / 160;
        if (imp > 0) {
            const norm = Math.sqrt(dx * dx + dy * dy);
            mx += dx * imp / norm;
            my += dy * imp / norm;
        }
    });
    game.rubys.forEach(ruby => {
        const dx = ruby.x - beetle.x;
        const dy = ruby.y - beetle.y;
        const imp = 40 * (240 - (dx * dx + dy * dy)) / 240;
        if (imp > 0) {
            const norm = Math.sqrt(dx * dx + dy * dy);
            mx += dx * imp / norm;
            my += dy * imp / norm;
        }
    });
    beetle.targetAngle = Math.atan2(my, mx);
}
