import env from "./env.ts";
import type { Game } from "./game.ts";

export function updateBots(game: Game) {
    const t = performance.now();
    game.beetles.forEach(b => {
        if(t - b.lastBrainActive > parseInt(env("INACTIVE_TIME_TO_PLAY_AS_BOT"))) {

        }
    })
}
