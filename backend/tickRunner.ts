import type { Game } from "./game.ts";
import { updateBots } from "./bots.ts";
import { updateGameLogic } from "./logic.ts";
import env from "./env.ts";
import type { GameServer } from "./server.ts";

const printLogsEvery = parseInt(env('PRINT_LOGS_EVERY'));

export class TickRunner {
    server: GameServer;
    games: Game[];

    lastStatPrint: number;
    botTotalTime = 0;
    logicTotalTime = 0;
    msgTotalTime = 0;
    ticksSincePrint = 0;
    totalTicks = 0;
    TPS: number | undefined;

    constructor(server: GameServer, games: Game[]) {
        this.server = server;
        this.games = games;
        this.lastStatPrint = performance.now();
    }

    start(TPS: number, warmupTicks: number) {
        this.TPS = TPS;

        const startT = performance.now();
        for (let i = 0; i < warmupTicks; i++) {
            this.runTickVerbose();
        }
        this.logMessage();
        this.lastStatPrint = performance.now();
        console.log(
            'Running ' + warmupTicks + ' warmup ticks ' +
            '(equivalent to ' + (warmupTicks / this.TPS).toFixed(2) + 's of gameplay) ' +
            'took ' + Math.round(performance.now() - startT) + 'ms'
        );

        const interval = 1000 / TPS;
        let next = performance.now();
        const that = this;

        function tick() {
            const now = performance.now();

            while (now >= next) {
                that.runTickVerbose();
                next += interval;
            }

            setTimeout(tick, Math.max(0, next - performance.now()));
        }

        tick();
    }

    runTick() {
        this.games.forEach(game => {
            updateBots(game);
            updateGameLogic(game);
        });

        this.server.sendMessages();

        this.games.forEach(game => {
            game.afterSendingMessages();
        });
    }

    logMessage() {
        const totalTime = ((this.botTotalTime + this.logicTotalTime + this.msgTotalTime) / this.ticksSincePrint).toFixed(1);
        console.log(
            (this.ticksSincePrint / (performance.now() - this.lastStatPrint) * 1000).toFixed(3) + 'TPS, ' +
            totalTime + (this.TPS === undefined ? '' : '/' + (1000 / this.TPS).toFixed(1) + 'ms total') + ' = ' +
            (this.botTotalTime / this.ticksSincePrint).toFixed(1) + 'ms bots + ' +
            (this.logicTotalTime / this.ticksSincePrint).toFixed(1) + 'ms logic + ' +
            (this.msgTotalTime / this.ticksSincePrint).toFixed(1) + 'ms messages, ' +
            this.totalTicks + ' ticks, ' +
            this.games.reduce((n, g) => n + g.beetles.size, 0) + ' total players'
        );

        this.botTotalTime = 0;
        this.logicTotalTime = 0;
        this.msgTotalTime = 0;
        this.ticksSincePrint = 0;
    }

    runTickVerbose() {
        const t1 = performance.now();
        this.games.forEach(game => {
            updateBots(game);
        });

        const t2 = performance.now();
        this.games.forEach(game => {
            updateGameLogic(game);
        });

        const t3 = performance.now();
        this.server.sendMessages();

        const t4 = performance.now();

        // We could measure time of afterSendingMessages(), but it takes no time at all
        this.games.forEach(game => {
            game.afterSendingMessages();
        });

        this.botTotalTime += t2 - t1;
        this.logicTotalTime += t3 - t2;
        this.msgTotalTime += t4 - t3;
        this.ticksSincePrint++;
        this.totalTicks++;

        if (t4 - this.lastStatPrint > printLogsEvery) {
            this.logMessage();
            this.lastStatPrint += printLogsEvery;
        }
    }
}