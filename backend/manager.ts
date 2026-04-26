import type { Beetle, Looks } from "../shared/types.ts";
import { updateBots } from "./bots.ts";
import env from "./env.ts";
import { updateGameLogic } from "./logic.ts";
import { sendMessages } from "./server.ts";

export const beetles = new Map<string, Beetle>();
export const looksMap = new Map<string, Looks>();

var lastStatPrint = performance.now();
var botTotalTime = 0;
var logicTotalTime = 0;
var msgTotalTime = 0;
var ticksSincePrint = 0;
var totalTicks = 0;

const print_logs_every = parseInt(env('PRINT_LOGS_EVERY'));
const tps = parseInt(env('TPS'));

export function gameTick() {
    const t1 = performance.now();
    updateBots();
    const t2 = performance.now();
    updateGameLogic();
    const t3 = performance.now();
    sendMessages();
    const t4 = performance.now();

    botTotalTime += t2 - t1;
    logicTotalTime += t3 - t2;
    msgTotalTime += t4 - t3;
    ticksSincePrint++;
    totalTicks++;

    if (t4 - lastStatPrint > print_logs_every) {
        lastStatPrint += print_logs_every;
        console.log(`${(ticksSincePrint / print_logs_every * 1000).toFixed(3)}TPS, ${((botTotalTime + logicTotalTime + msgTotalTime) / ticksSincePrint).toFixed(1)}/${(1000 / tps).toFixed(1)}ms total = ${(botTotalTime / ticksSincePrint).toFixed(1)}ms bots + ${(logicTotalTime / ticksSincePrint).toFixed(1)}ms logic + ${(msgTotalTime / ticksSincePrint).toFixed(1)}ms messages, ${totalTicks} ticks`)
        botTotalTime = 0;
        logicTotalTime = 0;
        msgTotalTime = 0;
        ticksSincePrint = 0;
    }
}
