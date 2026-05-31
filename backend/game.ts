import { NumericIdGenerator, samplePointInCircle } from "../shared/utils.js";
import env from "./env.js";

import { Beetle } from "./entities/beetle.js";
import { Point, spawnNewPoints } from "./entities/point.js";
import { Ruby } from "./entities/ruby.js";
import { Obstacle, spawnNewObstacles } from "./entities/obstacle.js";
import type { PointCreation, PointRemoval } from "../shared/dataEncoders.js";
import type { Particle } from "./entities/particle.js";
import type { Projectile } from "./entities/projectile.js";
import { Tournament } from "./tournament.js";

const maxSize = parseFloat(env('VITE_MAX_SIZE'));

export class Game {
    beetles: Map<string, Beetle> = new Map();
    globId: NumericIdGenerator = new NumericIdGenerator(255);
    looksMapIdEdits: string[] = [];

    points: Map<number, Point> = new Map();
    pointId: NumericIdGenerator = new NumericIdGenerator(65535);
    numEnvironmentDensityPoints = 0;
    numBeetleDeathPoints = 0;
    pointCreations: PointCreation[] = [];
    pointRemovals: PointRemoval[] = [];

    rubys: Map<number, Ruby> = new Map();
    rubyId: NumericIdGenerator = new NumericIdGenerator(65535);

    obstacles: Map<number, Obstacle> = new Map();
    obstacleId: NumericIdGenerator = new NumericIdGenerator(255);

    projectiles: Map<number, Projectile> = new Map();
    projectileId: NumericIdGenerator = new NumericIdGenerator(65535);

    particles: Particle[] = [];

    mapSize = parseInt(env('VITE_MAP_SIZE'));
    url: string;
    tournament: null | Tournament;

    constructor(url: string, isTournament: boolean = false) {
        this.url = url;
        this.tournament = isTournament ? new Tournament(this) : null;
    }

    afterSendingMessages() {
        this.looksMapIdEdits = [];
        this.pointCreations = [];
        this.pointRemovals = [];
        this.particles = [];
    }

    distanceFromObjects(x: number, y: number): number {
        // initialize with distance to world edge
        let distance = this.mapSize - Math.sqrt(x * x + y * y);

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

    getSpawnPointWithMargin(worldMargin: number = 0, centerMargin: number = 0): [number, number] {
        const maxR = this.mapSize - worldMargin;
        let bestX = 0;
        let bestY = 0;
        let bestMinDist = -1;

        for (let i = 0; i < 1000; i++) {
            const [x, y] = samplePointInCircle(maxR, centerMargin);
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
        this.points.forEach((point, id) => {
            if(point.update()) {
                this.points.delete(id);
                return;
            }
            
            this.beetles.forEach(beetle => {
                if (point.handleEating(beetle)) {
                    this.points.delete(id);
                }
            });
        });

        this.obstacles.forEach(obstacle => {
            obstacle.update();
            if (obstacle.getDistanceTo(0, 0) - obstacle.size > this.mapSize + 2) {
                obstacle.onDead();
                this.obstacles.delete(obstacle.id);
                return;
            }
            if(this.tournament === null || this.tournament.started) {
                this.obstacles.forEach(otherObstacle => {
                    obstacle.pushAwayFrom(otherObstacle);
                });
            }
        });

        this.beetles.forEach(beetle => {
            beetle.update();

            if (beetle.size > maxSize) {
                beetle.onDead();
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
                ruby.onDead();
                this.rubys.delete(ruby.id);
            }
        });

        this.projectiles.forEach(projectile => {
            projectile.update();
        });

        this.obstacles.forEach(obstacle => {
            [this.beetles, this.rubys, this.projectiles].forEach(objectMap => {
                objectMap.forEach(object => obstacle.handleCollision(object));
            });
            obstacle.finishUpdate();
        });

        this.projectiles.forEach(projectile => {
            if (projectile.isDead) {
                this.projectiles.delete(projectile.id);
            }
        });

        if (this.tournament === null) {
            spawnNewPoints(this);
            spawnNewObstacles(this);
        } else {
            this.tournament.update();
        }

        this.beetles.forEach(beetle => {
            beetle.clicked = false;
        })
    }
}
