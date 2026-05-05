import type { Beetle, Looks } from "../shared/types.ts";
import { generateId } from "../shared/utils.ts";
import env from "./env.ts";

export class Game {
    beetles: Map<string, Beetle>;
    looksMap: Map<string, Looks>;
    globIdMap: Map<string, string>;
    points: Map<number, [number, number]>;
    currentPointId = 0;

    looksMapIdEdits: string[];
    pointIdCreations: number[];
    pointIdRemovals: { id: number, animation: [number, number] }[];

    url: string;

    constructor(url: string) {
        this.beetles = new Map();
        this.looksMap = new Map();
        this.globIdMap = new Map();
        this.points = new Map();

        this.looksMapIdEdits = [];
        this.pointIdCreations = [];
        this.pointIdRemovals = []

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
            this.looksMap.set(globId, {
                mainColor: 'red',
                insideColor: 'blue',
                antennaColor: 'green',
                antennaSize: 0.5,
                antennaDots: true,
                nickname: id + '-' + globId
            });
            this.looksMapIdEdits.push(globId);
        }
        return globId;
    }
}
