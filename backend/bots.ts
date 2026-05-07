import { generateId, moduloAngle } from "../shared/utils.ts";
import { updateBot } from "./bots/updateBot.ts";
import env from "./env.ts";
import type { Game } from "./game.ts";
import { initializeBeetle } from "./logic.ts";

export function updateBots(game: Game) {
    const t = performance.now();

    game.beetles.forEach(b => {
        if (t - b.lastBrainActive > parseInt(env("INACTIVE_TIME_TO_PLAY_AS_BOT"))) {
            updateBot(game, b);
            b.targetAngle = moduloAngle(b.targetAngle);
        }
    });

    if (game.beetles.size < parseInt(env("TARGET_NUM_PLAYERS")) && Math.random() < 0.04) {
        const id = generateId(parseInt(env("VITE_ID_LENGTH")));
        game.beetles.set(id, initializeBeetle(id, true, game));
    }
}
