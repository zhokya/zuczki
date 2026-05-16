import { getRandomLook, getRandomNickname } from "../shared/looks.js";
import { NumericIdGenerator, samplePointInCircle } from "../shared/utils.js";
import env from "./env.js";

import { Beetle } from "./entities/beetle.js";
import type { Looks } from "../shared/types.js";
import { Point, spawnNewPoints } from "./entities/point.js";
import { Ruby } from "./entities/ruby.js";
import { Obstacle, spawnNewObstacles } from "./entities/obstacle.js";
import type { PointCreation, PointRemoval } from "../shared/dataEncoders.js";

const maxSize = parseFloat(env('VITE_MAX_SIZE'));
const mapSize = parseInt(env('VITE_MAP_SIZE'));

export class Game {
    beetles: Map<string, Beetle>;
    globIdMap: Map<string, number>;
    globId: NumericIdGenerator;

    looksMap: Map<number, Looks>;
    looksMapIdEdits: number[] = [];

    points: Map<number, Point>;
    pointId: NumericIdGenerator;
    numEnvironmentDensityPoints = 0;
    numBeetleDeathPoints = 0;
    pointCreations: PointCreation[] = [];
    pointRemovals: PointRemoval[] = [];

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

        this.globId = new NumericIdGenerator();
        this.pointId = new NumericIdGenerator();
        this.rubyId = new NumericIdGenerator();
        this.obstacleId = new NumericIdGenerator();

        this.url = url;
    }

    afterSendingMessages() {
        this.looksMapIdEdits = [];
        this.pointCreations = [];
        this.pointRemovals = [];
    }

    resolveGlobalId(id: string): number {
        let globId = this.globIdMap.get(id);
        if (globId === undefined) {
            globId = this.globId.next();
            this.globIdMap.set(id, globId);
        }
        if (!this.looksMap.has(globId)) {
            this.looksMap.set(globId, getRandomLook(getRandomNickname()));
            this.looksMapIdEdits.push(globId);
        }
        return globId;
    }

    distanceFromObjects(x: number, y: number): number {
        // initialize with distance to world edge
        let distance = mapSize - Math.sqrt(x * x + y * y);

        this.beetles.forEach(beetle => {
            const dx = beetle.x - x;
            const dy = beetle.y - y;
            distance = Math.min(distance, Math.sqrt(dx * dx + dy * dy) - beetle.size);
        });

        this.obstacles.forEach(obstacle => {
            distance = Math.min(distance, obstacle.getDistanceTo(x, y) - obstacle.getSize());
        });

        return distance;
    }

    getSpawnPointWithMargin(worldMargin: number): [number, number] {
        const maxR = mapSize - worldMargin;
        let bestX = 0;
        let bestY = 0;
        let bestMinDist = -1;

        for (let i = 0; i < 1000; i++) {
            const [x, y] = samplePointInCircle(maxR);
            const dist = this.distanceFromObjects(x, y);
            if (dist > bestMinDist) {
                bestMinDist = dist;
                bestX = x;
                bestY = y;
            }
        }

        return [bestX, bestY];
    }

    update() {
        // Remove points first, so that there are no points that are created and removed in the same tick
        this.beetles.forEach(beetle => {
            this.points.forEach((point, id) => {
                if (point.handleEating(beetle)) {
                    this.points.delete(id);
                }
            });
        });

        this.obstacles.forEach(obstacle => {
            obstacle.update();
            if (obstacle.getDistanceTo(0, 0) - obstacle.size > mapSize + 2) {
                this.obstacles.delete(obstacle.id);
                return;
            }
            this.obstacles.forEach(otherObstacle => {
                obstacle.pushAwayFrom(otherObstacle);
            });
        });

        this.beetles.forEach(beetle => {
            beetle.update();

            if (beetle.size > maxSize) {
                beetle.createPointsAndRubyAfterDeath(this);
                this.beetles.delete(beetle.id);
                return;
            }

            this.beetles.forEach(other => {
                if (other.id >= beetle.id) return;
                beetle.handleBeetleCollision(other);
            });
        });

        this.rubys.forEach(ruby => {
            ruby.update(this.beetles);
            if (ruby.hp < 0) {
                this.rubys.delete(ruby.id);
            }
        });

        this.obstacles.forEach(obstacle => {
            this.beetles.forEach(beetle => {
                obstacle.handleCollision(beetle);
            });
            this.rubys.forEach(ruby => {
                obstacle.handleCollision(ruby);
            });
            obstacle.finishUpdate();
        });

        spawnNewPoints(this);
        spawnNewObstacles(this);
    }
}
