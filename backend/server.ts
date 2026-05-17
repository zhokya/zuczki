import WebSocket, { WebSocketServer } from "ws";
import { isLooks, looksEntryEncoder, type LooksEntry } from "../shared/looks.js";
import env from "./env.js";
import type { Game } from "./game.js";
import type { IncomingMessage } from "http";
import { Beetle } from "./entities/beetle.js";
import { rubyProtectionTicks } from "./entities/ruby.js";
import { beetleEncoder, clientMessageEncoder, headerEncoder, leaderboardEntryEncoder, obstacleEncoder, pointCreationEncoder, pointRemovalEncoder, rubyEncoder, type LeaderboardEntry } from "../shared/dataEncoders.js";
import { moduloAngle } from "../shared/utils.js";
import { normalizeLooks } from "../shared/looks.js";
import { PointedDataView } from "../shared/encoder/types.js";
import { utf8ByteLength } from "../shared/encoder/stringEncoder.js";
import { getVisionBoundsFromCenter } from "../shared/visionBounds.js";
import { defaultAspect, getVisibleArea } from "../shared/getVisibleArea.js";

function filterMapValues<T>(map: Map<any, T>, filterFn: (element: T) => boolean): T[] {
    const result: T[] = [];
    map.forEach(element => {
        if(filterFn(element)) {
            result.push(element);
        }
    });
    return result;
}

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

    getLeaderboardData(game: Game): LeaderboardEntry[] {
        const opts: { globId: number, score: number }[] = [];
        game.beetles.forEach(b => {
            opts.push({ globId: b.globId, score: b.score });
        });
        opts.sort((a, b) => b.score - a.score);
        return opts.slice(0, 10).map((o, idx) => {
            return { place: idx + 1, globId: o.globId, score: o.score };
        });
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

                if (data.type === 'play' && beetleId !== null && !game.beetles.has(beetleId)) {
                    const beetle = new Beetle(beetleId, false, game, isLooks(data.looks) ? normalizeLooks(data.looks) : undefined);
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

            const centerX = beetle ? beetle.x : 0;
            const centerY = beetle ? beetle.y : 0;
            const visibleArea = getVisibleArea(beetle ? beetle.size : null);
            const bounds = getVisionBoundsFromCenter(centerX, centerY, visibleArea * defaultAspect, visibleArea);

            const beetlesToSend = filterMapValues(game.beetles, b => bounds.isInsideWithMargin(b.x, b.y, b.size * 1.5 + 1));
            const rubysToSend = filterMapValues(game.rubys, r => bounds.isInsideWithMargin(r.x, r.y, r.baseSize + 2));
            const obstaclesToSend = filterMapValues(
                game.obstacles, 
                o => bounds.isInsideWithMargin(o.x1, o.y1, o.size + 2) || (!o.isCircle && bounds.isInsideWithMargin(o.x2, o.y2, o.size + 1))
            );

            const looksToSend: LooksEntry[] = [];
            if (numMessages == 0) {
                game.beetles.forEach(beetle => {
                    looksToSend.push({ globId: beetle.globId, looks: beetle.looks });
                });
            } else {
                for (let i = 0; i < game.looksMapIdEdits.length; i++) {
                    const id = game.looksMapIdEdits[i];
                    const beetle = game.beetles.get(id) as Beetle;
                    looksToSend.push({ globId: beetle.globId, looks: beetle.looks });
                }
            }
            let numNicknameStringBytes = 0;
            looksToSend.forEach(lookEntry => {
                numNicknameStringBytes += utf8ByteLength(lookEntry.looks.nickname);
            });

            const leaderboardData = numMessages % 50 == 0 ? this.getLeaderboardData(game) : [];

            const header = {
                globId: beetle ? beetle.globId : 0,
                numBeetles: beetlesToSend.length,
                numRubys: rubysToSend.length,
                numObstacles: obstaclesToSend.length,
                numPointCreations: numMessages == 0 ? game.points.size : game.pointCreations.length,
                numPointRemovals: numMessages == 0 ? 0 : game.pointRemovals.length,
                numLooks: looksToSend.length,
                numLeaderboardEntries: leaderboardData.length
            }

            const buffer = Buffer.alloc(
                headerEncoder.bytes +
                header.numBeetles * beetleEncoder.bytes +
                header.numRubys * rubyEncoder.bytes +
                header.numObstacles * obstacleEncoder.bytes +
                header.numPointCreations * pointCreationEncoder.bytes +
                header.numPointRemovals * pointRemovalEncoder.bytes +
                header.numLooks * looksEntryEncoder.bytes + numNicknameStringBytes +
                header.numLeaderboardEntries * leaderboardEntryEncoder.bytes
            );
            // console.log(
            //     'h', headerEncoder.bytes,
            //     'b', header.numBeetles * beetleEncoder.bytes,
            //     'r', header.numRubys * rubyEncoder.bytes,
            //     'o', header.numObstacles * obstacleEncoder.bytes,
            //     'pc', header.numPointCreations * pointCreationEncoder.bytes,
            //     'pr', header.numPointRemovals * pointRemovalEncoder.bytes,
            //     'l', header.numLooks * looksEntryEncoder.bytes + numNicknameStringBytes,
            //     'l', header.numLeaderboardEntries * leaderboardEntryEncoder.bytes
            // );
            const view = new PointedDataView(new DataView(
                buffer.buffer,
                buffer.byteOffset,
                buffer.byteLength
            ));

            headerEncoder.writeToBuffer(view, header);
            beetlesToSend.forEach(b => {
                beetleEncoder.writeToBuffer(view, {
                    x: b.x,
                    y: b.y,
                    angle: b.angle,
                    size: b.size,
                    score: b.score,
                    targetAngle: b.targetAngle,
                    globId: b.globId
                });
            });
            rubysToSend.forEach(r => {
                rubyEncoder.writeToBuffer(view, {
                    id: r.id,
                    x: r.x,
                    y: r.y,
                    baseSize: r.baseSize,
                    hp: r.hp,
                    protection: r.protectionTicks / rubyProtectionTicks
                });
            });
            obstaclesToSend.forEach(o => {
                obstacleEncoder.writeToBuffer(view, {
                    id: o.id,

                    isCircle: o.isCircle,
                    x1: o.x1,
                    y1: o.y1,
                    x2: o.x2,
                    y2: o.y2,
                    size: o.getSize(),

                    isAggressive: o.isAggressive
                });
            });

            if (numMessages == 0) {
                game.points.forEach(p => {
                    pointCreationEncoder.writeToBuffer(view, { id: p.id, x: p.x, y: p.y });
                });
            } else {
                game.pointCreations.forEach(p => {
                    pointCreationEncoder.writeToBuffer(view, p);
                });
                game.pointRemovals.forEach(p => {
                    pointRemovalEncoder.writeToBuffer(view, p);
                });
            }

            looksToSend.forEach(lookEntry => {
                looksEntryEncoder.writeToBuffer(view, lookEntry);
            });

            leaderboardData.forEach(leaderboardEntry => {
                leaderboardEntryEncoder.writeToBuffer(view, leaderboardEntry);
            });

            numMessages++;

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
