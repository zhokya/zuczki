import { generateId } from "../../shared/utils.js";
import { Beetle } from "../entities/beetle.js";
import { Game } from "../game.js";
import { PythonServer } from "./pythonServer.js";

const numGames = 16;
const beetlesPerGame = 16;

const games: Game[] = [];
for(let i = 0; i < numGames; i ++) {
    games.push(new Game(`/${i}`));
}

const beetles: Beetle[] = [];
games.forEach(game => {
    for(let b = 0; b < beetlesPerGame; b ++) {
        const id = generateId(8);
        const beetle = new Beetle(id, true, game);
        game.beetles.set(id, beetle);
        beetles.push(beetle);
    }
});

const pythonServer = new PythonServer(8765, true);
await pythonServer.connected;

while(true) {
    beetles.forEach((beetle, idx) => {
        const game = beetle.game;
        if(!game.beetles.has(beetle.id)) {
            const id = generateId(8);
            const newBeetle = new Beetle(id, true, game);
            game.beetles.set(id, newBeetle);
            beetles[idx] = newBeetle;
        }
    });

    await pythonServer.updateBots(beetles);
    
    games.forEach(game => {
        game.update();
        game.afterSendingMessages();
    });
}
