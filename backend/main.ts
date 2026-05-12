import env from "./env.ts";
import { Game } from "./game.ts";
import { GameServer } from "./server.ts";
import { TickRunner } from "./tickRunner.ts";

const TPS = parseInt(env('TPS'));
const warmupTicks = parseInt(env('WARMUP_TICKS'))
const exactTickMode = env('EXACT_TICK_MODE') === 'yes';
const port = parseInt(env('WEBSOCKET_PORT'));

const games = [new Game('/')];
const server = new GameServer(port, games);

const tickRunner = new TickRunner(server, games);
tickRunner.start(TPS, warmupTicks, exactTickMode);
