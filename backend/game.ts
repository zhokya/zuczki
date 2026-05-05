import type { Beetle, Looks } from "../shared/types.ts";
import { generateId } from "../shared/utils.ts";
import env from "./env.ts";

export class Game {
    beetles: Map<string, Beetle>;
    looksMap: Map<string, Looks>;
    globIdMap: Map<string, string>;

    looksMapIdEdits: string[];

    url: string;

    constructor(url: string) {
        this.beetles = new Map<string, Beetle>();
        this.looksMap = new Map<string, Looks>();
        this.globIdMap = new Map<string, string>();

        this.looksMapIdEdits = [];

        this.url = url;
    }

    afterSendingMessages() {
        this.looksMapIdEdits = [];
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
