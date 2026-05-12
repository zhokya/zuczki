import { getRandomLook, getRandomNickname } from "../shared/looks.ts";
import type { Beetle, Looks, Obstacle, Ruby } from "../shared/types.ts";
import { generateId, NumericIdGenerator } from "../shared/utils.ts";
import env from "./env.ts";

export class Game {
    beetles: Map<string, Beetle>;
    globIdMap: Map<string, string>;

    looksMap: Map<string, Looks>;
    looksMapIdEdits: string[];

    points: Map<number, [number, number, boolean]>;
    numEnvironmentDensityPoints = 0; // marked as 'false' in points
    numBeetleDeathPoints = 0; // marked as 'true' in points
    pointId: NumericIdGenerator;
    pointIdCreations: number[];
    pointIdRemovals: { id: number, animation: [number, number] }[];

    rubys: Map<number, Ruby>;
    rubyId: NumericIdGenerator;

    obstacles: Map<number, Obstacle>;
    obstacleId: NumericIdGenerator;

    url: string;

    constructor(url: string) {
        this.beetles = new Map();
        this.looksMap = new Map();
        this.globIdMap = new Map();
        this.points = new Map();
        this.rubys = new Map();
        this.obstacles = new Map();

        this.looksMapIdEdits = [];
        this.pointIdCreations = [];
        this.pointIdRemovals = [];

        this.pointId = new NumericIdGenerator();
        this.rubyId = new NumericIdGenerator();
        this.obstacleId = new NumericIdGenerator();

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
