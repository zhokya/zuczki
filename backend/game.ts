import { getRandomLook, getRandomNickname } from "../shared/looks.ts";
import type { Beetle, Looks, Ruby } from "../shared/types.ts";
import { generateId } from "../shared/utils.ts";
import env from "./env.ts";

export class Game {
    beetles: Map<string, Beetle>;
    globIdMap: Map<string, string>;

    looksMap: Map<string, Looks>;
    looksMapIdEdits: string[];

    points: Map<number, [number, number]>;
    currentPointId = 0;
    pointIdCreations: number[];
    pointIdRemovals: { id: number, animation: [number, number] }[];

    rubys: Map<number, Ruby>;
    currentRubyId = 0;

    url: string;

    constructor(url: string) {
        this.beetles = new Map();
        this.looksMap = new Map();
        this.globIdMap = new Map();
        this.points = new Map();
        this.rubys = new Map();

        this.looksMapIdEdits = [];
        this.pointIdCreations = [];
        this.pointIdRemovals = [];

        this.url = url;
    }

    afterSendingMessages() {
        this.looksMapIdEdits = [];
        this.pointIdCreations = [];
        this.pointIdRemovals = [];
    }

    resolveGlobalId(id: string): string {
        let globId = this.globIdMap.get(id);
        if (globId === undefined) {
            globId = generateId(parseInt(env('VITE_ID_LENGTH')));
            this.globIdMap.set(id, globId);
        }
        if (!this.looksMap.has(globId)) {
            this.looksMap.set(globId, getRandomLook(getRandomNickname()));
            this.looksMapIdEdits.push(globId);
        }
        return globId;
    }
}
