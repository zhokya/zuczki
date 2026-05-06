import { generateId, moduloAngle } from "../shared/utils.ts";
import env from "./env.ts";
import type { Game } from "./game.ts";
import { initializeBeetle } from "./logic.ts";

export function updateBots(game: Game) {
    const t = performance.now();

    game.beetles.forEach(b => {
        if (t - b.lastBrainActive > parseInt(env("INACTIVE_TIME_TO_PLAY_AS_BOT"))) {
            if (Math.random() < 0.005) {
                b.clicked = true;
            }

            let mx = 0;
            let my = 0;

            game.points.forEach(pos => {
                const dx = pos[0] - b.x;
                const dy = pos[1] - b.y;
                const imp = (160 - (dx * dx + dy * dy)) / 160;
                if (imp > 0) {
                    const norm = Math.sqrt(dx * dx + dy * dy);
                    mx += dx * imp / norm;
                    my += dy * imp / norm;
                }
            });

            game.rubys.forEach(r => {
                const dx = r.x - b.x;
                const dy = r.y - b.y;
                const imp = 40 * (240 - (dx * dx + dy * dy)) / 240;
                if (imp > 0) {
                    const norm = Math.sqrt(dx * dx + dy * dy);
                    mx += dx * imp / norm;
                    my += dy * imp / norm;
                }
            });

            b.targetAngle = moduloAngle(Math.atan2(my, mx));
        }
    });

    if (game.beetles.size < parseInt(env("TARGET_NUM_PLAYERS")) && Math.random() < 0.04) {
        const id = generateId(parseInt(env("VITE_ID_LENGTH")));
        game.beetles.set(id, initializeBeetle(id, true));
    }
}
