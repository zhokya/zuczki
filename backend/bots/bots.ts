import { generateId } from "../../shared/utils.js";
import { Beetle } from "../entities/beetle.js";
import env from "../env.js";
import type { Game } from "../game.js";
import { PythonServer } from "./pythonServer.js";

const targetNumPlayers = 16;

const pythonServer = new PythonServer(8767, false);
await pythonServer.connected;

export async function updateBots(game: Game) {
    if(game.tournament !== null) return;

    const t = performance.now();

    if (game.beetles.size < targetNumPlayers && Math.random() < 0.04) {
        const id = generateId(parseInt(env("VITE_ID_LENGTH")));
        game.beetles.set(id, new Beetle(id, true, game));
    }

    const botBeetles: Beetle[] = [];
    game.beetles.forEach(beetle => {
        if (t - beetle.lastBrainActive > parseInt(env("INACTIVE_TIME_TO_PLAY_AS_BOT"))) {
            botBeetles.push(beetle);
        }
    });

    if(botBeetles.length > 0) {
        await pythonServer.updateBots(botBeetles);
    }
}
