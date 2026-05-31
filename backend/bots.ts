import { generateId, moduloAngle } from "../shared/utils.js";
import { updateBot } from "./bots/updateBot.js";
import { Beetle } from "./entities/beetle.js";
import env from "./env.js";
import type { Game } from "./game.js";

const targetNumPlayers = 16;

export function updateBots(game: Game) {
    if(game.tournament !== null) return;

    const t = performance.now();

    game.beetles.forEach(b => {
        if (t - b.lastBrainActive > parseInt(env("INACTIVE_TIME_TO_PLAY_AS_BOT"))) {
            updateBot(game, b);
            b.targetAngle = moduloAngle(b.targetAngle);
        }
    });

    if (game.beetles.size < targetNumPlayers && Math.random() < 0.04) {
        const id = generateId(parseInt(env("VITE_ID_LENGTH")));
        game.beetles.set(id, new Beetle(id, true, game));
    }
}
