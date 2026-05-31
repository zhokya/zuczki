import env from "./env.js";
import { Game } from "./game.js";
import { GameServer } from "./server.js";
import { TickRunner } from "./tickRunner.js";

const TPS = parseInt(env('TPS'));
const warmupTicks = parseInt(env('WARMUP_TICKS'))
const port = parseInt(env('WEBSOCKET_PORT'));

const games = [new Game('/'), new Game('/tournament')];
const server = new GameServer(port, games);

const tickRunner = new TickRunner(server, games);
tickRunner.start(TPS, warmupTicks);
