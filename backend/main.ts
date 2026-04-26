import env from "./env.ts";
import { gameTick } from "./manager.ts";

const TPS = parseInt(env('TPS'));
const interval = 1000 / TPS;

let next = performance.now();

function tick() {
    const now = performance.now();

    while (now >= next) {
        gameTick();
        next += interval;
    }

    setTimeout(tick, Math.max(0, next - performance.now()));
}

tick();
