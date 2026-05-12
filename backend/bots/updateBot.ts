import type { Beetle } from "../../shared/types.js";
import { Game } from "../game.js";

import { updateBot as updateBot0 } from "./0.js";

import { updateBot as updateBot1 } from "./1.js";
import { updateBot as updateBot2 } from "./2.js";
import { updateBot as updateBot3 } from "./3.js";

import { updateBot as updateBot4 } from "./4.js";
import { updateBot as updateBot5 } from "./5.js";

const updateFns = [updateBot0, updateBot1, updateBot2, updateBot3, updateBot4, updateBot5];

export function updateBot(game: Game, beetle: Beetle) {
    if (beetle.botData === null) {
        beetle.botData = { botType: Math.floor(Math.random() * 6) };
    }

    updateFns[beetle.botData.botType](game, beetle);
}
