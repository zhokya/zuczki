import type { Beetle } from "../../shared/types.ts";
import { Game } from "../game.ts";

import { updateBot as updateBot0 } from "./0.ts";

import { updateBot as updateBot1 } from "./1.ts";
import { updateBot as updateBot2 } from "./2.ts";
import { updateBot as updateBot3 } from "./3.ts";

import { updateBot as updateBot4 } from "./4.ts";
import { updateBot as updateBot5 } from "./5.ts";

const updateFns = [updateBot0, updateBot1, updateBot2, updateBot3, updateBot4, updateBot5];

export function updateBot(game: Game, beetle: Beetle) {
    if (beetle.botData === null) {
        beetle.botData = { botType: Math.floor(Math.random() * 6) };
    }

    updateFns[beetle.botData.botType](game, beetle);
}
