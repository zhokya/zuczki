import WebSocket, { WebSocketServer } from "ws";
import { isLooks } from "../shared/types.js";
import env from "./env.js";
import type { Game } from "./game.js";
import type { IncomingMessage } from "http";
import { Beetle } from "./entities/beetle.js";
import { rubyProtectionTicks } from "./entities/ruby.js";
import { beetleEncoder, clientMessageEncoder, headerEncoder, obstacleEncoder, pointCreationEncoder, pointRemovalEncoder, rubyEncoder } from "../shared/dataEncoders.js";
import { PointedDataView } from "../shared/encoder.js";
import { moduloAngle } from "../shared/utils.js";
import { normalizeLooks } from "../shared/looks.js";

export class GameServer {
    port: number;
    games: Game[];
    wss: WebSocketServer;
    updateFns: (() => void)[] = [];

    constructor(port: number, games: Game[]) {
        this.port = port;
        this.games = games;
        this.wss = new WebSocketServer({ port });
        this.updateFns = [];

        this.wss.on('connection', (ws, request) => {
            this.onConnection(ws, request);
        });
    }

    getGameFromUrl(url: string): Game | null {
        for (let i = 0; i < this.games.length; i++) {
            if (this.games[i].url === url) {
                return this.games[i];
            }
        }
        return null;
    }

    getLeaderboardData(game: Game, selfId: string | null): [number, string, number, boolean][] {
        const opts: [string, number, boolean][] = [];
        game.beetles.forEach(b => {
            const looks = game.looksMap.get(game.resolveGlobalId(b.id));
            opts.push([looks === undefined ? '' : looks.nickname, b.score, b.id === selfId]);
        });
        opts.sort((a, b) => b[1] - a[1]);
        return opts.slice(0, 10).map((o, idx) => [idx + 1, o[0], o[1], o[2]]);
    }

    onConnection(ws: WebSocket, request: IncomingMessage) {
        if (request.url === undefined) {
            ws.close(1008, 'Invalid path');
            return;
        }
        var game_ = this.getGameFromUrl(request.url);
        if (game_ === null) {
            ws.close(1008, 'Invalid path');
            return;
        }
        var game = game_;

        var beetleId: string | null = null;

        ws.on('message', (rawData, isBinary) => {
            try {
                if (isBinary) {
                    if (beetleId === null) return;
                    const beetle = game.beetles.get(beetleId);
                    if (beetle === undefined) return;

                    const buffer = rawData as Buffer;
                    const view = new PointedDataView(new DataView(
                        buffer.buffer,
                        buffer.byteOffset,
                        buffer.byteLength
                    ));
                    const message = clientMessageEncoder.readFromBuffer(view);

                    beetle.lastBrainActive = performance.now();
                    beetle.targetAngle = moduloAngle(message.targetAngle);
                    if (message.clickMode == 1) {
                        beetle.clicked = true;
                    }

                    return;
                }

                const data = JSON.parse(rawData.toString());

                if (data.type === 'register') {
                    const id = data.id;
                    if (typeof (id) == 'string' && id.length === parseInt(env('VITE_ID_LENGTH'))) {
                        beetleId = id;
                    }
                }

                if (isLooks(data.looks) && beetleId !== null && !game.beetles.has(beetleId)) {
                    normalizeLooks(data.looks);
                    game.looksMap.set(game.resolveGlobalId(beetleId), data.looks);
                    game.looksMapIdEdits.push(game.resolveGlobalId(beetleId));
                }

                if (data.type === 'play' && beetleId !== null && !game.beetles.has(beetleId)) {
                    const beetle = new Beetle(beetleId, false, game);
                    game.beetles.set(beetleId, beetle);
                }
            } catch (e) {
                // TODO: potentially remove this in the future?
                console.log(e);
            }
        });

        let numMessages = 0;
        const updateFn = () => {
            const beetle = beetleId === null ? undefined : game.beetles.get(beetleId);

            // TODO: do not send everything!
            const header = {
                globId: beetle ? game.resolveGlobalId(beetle.id) : 0,
                numBeetles: game.beetles.size,
                numRubys: game.rubys.size,
                numObstacles: game.obstacles.size,
                numPointCreations: game.pointCreations.length,
                numPointRemovals: game.pointRemovals.length,
            }
            const buffer = Buffer.alloc(
                headerEncoder.bytes + 
                header.numBeetles * beetleEncoder.bytes +
                header.numRubys * rubyEncoder.bytes +
                header.numObstacles * obstacleEncoder.bytes +
                header.numPointCreations * pointCreationEncoder.bytes +
                header.numPointRemovals * pointRemovalEncoder.bytes
            );
            const view = new PointedDataView(new DataView(
                buffer.buffer,
                buffer.byteOffset,
                buffer.byteLength
            ));

            headerEncoder.writeToBuffer(view, header);
            game.beetles.forEach(b => {
                beetleEncoder.writeToBuffer(view, {
                    x: b.x,
                    y: b.y,
                    angle: b.angle,
                    size: b.size,
                    score: b.score,
                    targetAngle: b.targetAngle,
                    globId: game.resolveGlobalId(b.id)
                });
            });
            game.rubys.forEach(r => {
                rubyEncoder.writeToBuffer(view, {
                    id: r.id,
                    x: r.x,
                    y: r.y,
                    baseSize: r.baseSize,
                    hp: r.hp,
                    protection: r.protectionTicks / rubyProtectionTicks
                });
            });
            game.obstacles.forEach(o => {
                obstacleEncoder.writeToBuffer(view, {
                    id: o.id,

                    isCircle: o.isCircle ? 1 : 0,
                    x1: o.x1,
                    y1: o.y1,
                    x2: o.x2,
                    y2: o.y2,
                    size: o.getSize(),
                    
                    isAggressive: o.isAggressive ? 1 : 0
                });
            });
            game.pointCreations.forEach(p => {
                pointCreationEncoder.writeToBuffer(view, p);
            });
            game.pointRemovals.forEach(p => {
                pointCreationEncoder.writeToBuffer(view, p);
            });

            // if (numMessages == 0) {
            //     msg.looks = Object.fromEntries(game.looksMap);

            //     msg.newPoints = [];
            //     msg.removedPoints = [];

            //     game.points.forEach((point, id) => {
            //         msg.newPoints.push([id, point.x, point.y])
            //     });
            // } else if (game.looksMapIdEdits.length > 0) {
            //     msg.looks = {};

            //     for (let i = 0; i < game.looksMapIdEdits.length; i++) {
            //         const idd = game.looksMapIdEdits[i];
            //         const look = game.looksMap.get(idd);
            //         if (look !== undefined) {
            //             msg.looks[idd] = look;
            //         }
            //     }
            // }

            // if(numMessages % 50 == 0) {
            //     msg.leaderboard = this.getLeaderboardData(game, beetleId);
            // }

            numMessages ++;

            ws.send(buffer.buffer);
        }
        this.updateFns.push(updateFn);

        ws.on('close', () => {
            const index = this.updateFns.findIndex(fn => fn === updateFn);
            if (index !== -1) {
                this.updateFns.splice(index, 1);
            }
        });
    }

    sendMessages() {
        this.updateFns.forEach(fn => {
            fn();
        });
    }
}
