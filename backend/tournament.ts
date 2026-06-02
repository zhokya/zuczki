import { getRandomLook } from "../shared/looks.js";
import { lerp } from "../shared/utils.js";
import type { Beetle } from "./entities/beetle.js";
import { Obstacle, spawnNewObstacles } from "./entities/obstacle.js";
import { spawnNewPoints } from "./entities/point.js";
import { Ruby } from "./entities/ruby.js";
import env from "./env.js";
import type { Game } from "./game.js";

const adminId = env('ADMIN_ID');
const mapSize = parseInt(env('VITE_MAP_SIZE'));
const maxTournamentDuration = 5 * 60 * 24;
const minTournamentDuration = 1 * 60 * 24;
const tournamentIntroductionDuration = 10 * 24;
const maxLinearDecreaseSpeed = 0.1;
const minMapSize = 10;

class Home {
    edges: Obstacle[] = [];
    game: Game;
    beetle: Beetle | null = null;
    tournament: Tournament;
    ticksSinceChange = 0;
    center: { x: number, y: number } | null = null;

    constructor(game: Game, tournament: Tournament) {
        this.game = game;
        this.tournament = tournament;
    }

    update(x: number, y: number, angle: number) {
        const homeSize = 2;
        const tt = this.tournament.initiated ? 1 : 0.1;

        if (this.center === null) {
            this.center = { x, y };
        }
        this.center.x = lerp(this.center.x, x, tt);
        this.center.y = lerp(this.center.y, y, tt);

        for (let i = 0; i < 3; i++) {
            const phi1 = angle + Math.PI / 4 + Math.PI / 2 * (i + 0.12);
            const phi2 = angle + Math.PI / 4 + Math.PI / 2 * (i + 0.88);

            const x1 = x - Math.cos(phi1) * homeSize;
            const y1 = y - Math.sin(phi1) * homeSize;
            const x2 = x - Math.cos(phi2) * homeSize;
            const y2 = y - Math.sin(phi2) * homeSize;

            if (i < this.edges.length) {
                this.edges[i].x1 = lerp(this.edges[i].x1, x1, tt);
                this.edges[i].x2 = lerp(this.edges[i].x2, x2, tt);
                this.edges[i].y1 = lerp(this.edges[i].y1, y1, tt);
                this.edges[i].y2 = lerp(this.edges[i].y2, y2, tt);
            } else {
                const edge = new Obstacle(this.game);
                this.game.obstacles.set(edge.id, edge);
                this.edges[i] = edge;

                edge.animationSpeed = 0;
                edge.animation = 0;
                edge.x1 = x1;
                edge.y1 = y1;
                edge.x2 = x2;
                edge.y2 = y2;
                edge.isAggressive = false;
                edge.isCircle = false;
                edge.rotationSpeed = 0;
                edge.size = 0.3;
                edge.animation = 0.99;
            }
        }

        this.game.beetles.forEach(b => {
            if (this.beetle !== null) return;
            if (this.tournament.assignedBeetleIds.has(b.globId)) return;
            if (this.ticksSinceChange < 24) return;
            if (this.tournament.initiated) return;
            const dx = x - b.x;
            const dy = y - b.y;
            if (dx * dx + dy * dy < homeSize * homeSize / 2) {
                this.tournament.assignedBeetleIds.add(b.globId);
                this.beetle = b;
                this.ticksSinceChange = 0;
            }
        });

        this.ticksSinceChange++;
        if (this.beetle !== null) {
            this.beetle.x = lerp(this.beetle.x, this.center.x, 1 - Math.exp(-0.2 * this.ticksSinceChange));
            this.beetle.y = lerp(this.beetle.y, this.center.y, 1 - Math.exp(-0.2 * this.ticksSinceChange));
            if (this.beetle.powerupTicks !== null && this.beetle.powerupTicks > 48 && this.beetle.id == adminId) {
                this.tournament.initiate();
            }
            if (this.beetle.clicked && !this.tournament.initiated) {
                this.tournament.assignedBeetleIds.delete(this.beetle.globId);
                this.beetle = null;
                this.ticksSinceChange = 0;
            }
        }
    }
}

class Group {
    score: number = 0;
    homes: Home[] = [];
    nickname = '';
    game: Game;
    tournament: Tournament;

    constructor(game: Game, tournament: Tournament) {
        this.game = game;
        this.tournament = tournament;

        for (let i = 0; i < 2; i++) {
            this.homes.push(new Home(this.game, tournament));
        }
    }

    update(groupIndex: number, numGroups: number) {
        const r = lerp(10 + numGroups * 2, mapSize - 4, 1 - Math.exp(-0.06 * this.tournament.initiatedT));
        const angle = groupIndex / numGroups * Math.PI * 2 - Math.PI / 2;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;

        for (let i = 0; i < this.homes.length; i++) {
            const mult = (i - (this.homes.length - 1) / 2) * 5;
            this.homes[i].update(x + Math.sin(angle) * mult, y - Math.cos(angle) * mult, angle);
        }
    }

    filterBeetle(beetle: Beetle) {
        this.homes.forEach(home => {
            if (home.beetle == beetle) {
                home.beetle = null;
            }
        });
    }

    numBeetles() {
        return this.homes.reduce((v, h) => v + (h.beetle === null ? 0 : 1), 0);
    }

    updateNickname() {
        const nicknames: string[] = [];
        this.homes.forEach(home => {
            if (home.beetle !== null) {
                nicknames.push(home.beetle.looks.nickname);
            }
        });

        this.nickname = nicknames.join(' & ');
    }
}

export class Tournament {
    game: Game;
    initiated = false;
    started = false;
    ticksToStart = -1;
    tournamentTicks = 0;
    groups: Group[] = [];
    leaderboardGroups: Group[] = [];
    assignedBeetleIds = new Set<number>();
    initiatedT = 0;
    initialNumBeetles = 0;

    constructor(game: Game) {
        this.game = game;
    }

    update() {
        if (this.started || this.initiated) {
            this.leaderboardGroups = this.groups;
        }
        spawnNewPoints(this.game, !this.started);

        if (this.started) {
            spawnNewObstacles(this.game);

            this.groups.forEach(group => {
                group.homes.forEach(home => {
                    home.edges.forEach(edge => {
                        const norm = Math.sqrt(edge.x1 * edge.x1 + edge.y1 * edge.y1);
                        edge.x1 += edge.x1 / norm * 0.4;
                        edge.y1 += edge.y1 / norm * 0.4;
                        edge.x2 += edge.x2 / norm * 0.4;
                        edge.y2 += edge.y2 / norm * 0.4;
                    });
                    if (home.beetle !== null) {
                        group.score = Math.max(group.score, home.beetle.score);
                    }
                });
            });

            this.tournamentTicks++;

            if(this.tournamentTicks > tournamentIntroductionDuration) {
                const maxArea = mapSize * mapSize;
                const minArea = minMapSize * minMapSize;
                const currArea = this.game.mapSize * this.game.mapSize;

                const tt1 = 1 - this.game.beetles.size / this.initialNumBeetles;
                const tt2 = (this.tournamentTicks - tournamentIntroductionDuration) / (maxTournamentDuration - tournamentIntroductionDuration);
                const targetArea = lerp(maxArea, minArea, Math.min(1, Math.max(0, tt1, tt2)));

                const maxDecreaseSpeed = currArea - Math.pow(this.game.mapSize - maxLinearDecreaseSpeed, 2);
                const defaultDecreaseSpeed = (currArea - minArea) / Math.max(1, maxTournamentDuration - this.tournamentTicks);
                const decreaseSpeed = Math.min(
                    maxDecreaseSpeed, 
                    defaultDecreaseSpeed * (tt1 > tt2 ? maxTournamentDuration / minTournamentDuration : 1)
                );

                const newArea = Math.max(targetArea, currArea - decreaseSpeed);
                this.game.mapSize = Math.sqrt(newArea);
            }

            if (this.game.beetles.size == 0) {
                this.end();
            }

            return;
        }

        this.tournamentTicks = 0;
        this.game.mapSize = mapSize;

        if (this.initiated) {
            this.initiatedT++;
            if (this.initiatedT > 130 && Math.random() < 0.03) {
                this.start();
            }
        }

        this.game.beetles.forEach(beetle => {
            beetle.size = 1;
            beetle.score = 0;
            if (beetle.lastBrainActive + 10000 < performance.now()) {
                this.kickBeetle(beetle);
            }
        });

        if (this.game.rubys.size != 1) {
            this.game.rubys.forEach(ruby => {
                ruby.onDead();
            });
            this.game.rubys.clear();
            const ruby = new Ruby(0, 0, 0, 0, 1.5, this.game);
            this.game.rubys.set(ruby.id, ruby);
        } else {
            this.game.rubys.forEach(r => {
                r.x = 0;
                r.y = 0;
                r.hp = 1;
            });
        }

        const numPairs = Math.max(3, Math.ceil(this.game.beetles.size / 2) + 2);

        while (this.groups.length > numPairs) {
            let deleteIndex = 0;
            for (let i = 0; i < this.groups.length; i++) {
                if (this.groups[i].numBeetles() == 0) {
                    deleteIndex = i;
                    break;
                }
            }

            this.groups[deleteIndex].homes.forEach(home => {
                home.edges.forEach(edge => {
                    this.game.obstacleId.unregister(edge.id);
                    this.game.obstacles.delete(edge.id);
                });
            });
            this.groups.splice(deleteIndex, 1);
        }

        while (this.groups.length < numPairs) {
            this.groups.push(new Group(this.game, this));
        }

        this.groups.forEach((group, groupIndex) => group.update(groupIndex, this.groups.length));
    }

    kickBeetle(beetle: Beetle) {
        this.game.globId.unregister(beetle.globId);
        this.game.beetles.delete(beetle.id);
        this.groups.forEach(group => group.filterBeetle(beetle));
        this.assignedBeetleIds.delete(beetle.globId);
    }

    initiate() {
        if (this.initiated) return;
        this.initiated = true;
        this.initiatedT = 0;

        this.game.beetles.forEach(beetle => {
            if (!this.assignedBeetleIds.has(beetle.globId)) {
                this.kickBeetle(beetle);
            }
        });

        this.initialNumBeetles = this.game.beetles.size;

        this.groups.forEach(group => {
            group.updateNickname();

            const looks = getRandomLook(group.nickname);
            group.homes.forEach(home => {
                if (home.beetle !== null) {
                    home.beetle.looks = looks;
                    this.game.looksMapIdEdits.push(home.beetle.id);
                }
            });
        });
    }

    start() {
        if (this.started) return;
        this.started = true;

        this.game.beetles.forEach(beetle => {
            beetle.vx = 0;
            beetle.vy = 0;
            beetle.vsize = 0;
            beetle.poweruping = false;
            beetle.powerupTicks = null;
            beetle.freezedTicks = 0;
        });

        this.game.projectiles.forEach(projectile => {
            projectile.onDead();
        });
    }

    end() {
        console.log('=== Tournament round finished after ' + this.tournamentTicks + ' ticks ===');
        this.groups = this.groups.filter(group => group.numBeetles() > 0);
        this.groups.sort((a, b) => b.score - a.score);
        this.groups.forEach((group, idx) => {
            console.log((idx + 1) + '. ' + group.nickname + ' (' + group.score + ')');
        });

        this.initiated = false;
        this.started = false;
        this.ticksToStart = -1;
        this.tournamentTicks = 0;
        this.leaderboardGroups = this.groups;
        this.groups = [];
        this.assignedBeetleIds.clear();
        this.initiatedT = 0;

        this.game.points.forEach(point => point.onDead());
        this.game.points.clear();

        this.game.obstacles.forEach(obstacle => obstacle.onDead());
        this.game.obstacles.clear();

        this.game.beetles.forEach(beetle => this.kickBeetle(beetle));
    }
}
