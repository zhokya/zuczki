import env from "./env.ts";
import { beetles } from "./manager.ts";

export function updateBots() {
    const t = performance.now();
    beetles.forEach(beetle => {
        if(t - beetle.lastBrainActive > parseInt(env("INACTIVE_TIME_TO_PLAY_AS_BOT"))) {

        }
    })
}
