import WebSocket, { WebSocketServer } from "ws";
import { isLooks, moduloAngle, type Message } from "../shared/index.ts";
import env from "./env.ts";
import { initializeBeetle, rubyProtectionTicks } from "./logic.ts";
import type { Game } from "./game.ts";
import type { IncomingMessage } from "http";

export class GameServer {
    port: number;
    games: Game[];
    wss: WebSocketServer;
    updateFns: (() => void)[] = [];

    constructor(port: number, games: Game[]) {
        this.port = port;
        this.games = games;
        this.wss = new WebSocketServer({ port: 6767 });
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

                    let buffer: Buffer;
                    if (Buffer.isBuffer(rawData)) {
                        buffer = rawData;
                    } else if (rawData instanceof ArrayBuffer) {
                        buffer = Buffer.from(rawData);
                    } else if (Array.isArray(rawData)) {
                        buffer = Buffer.concat(rawData);
                    } else {
                        return;
                    }

                    const view = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
                    const uint8 = view.getUint8(0);
                    let targetAngle = view.getFloat32(1, true);

                    if (!Number.isFinite(targetAngle)) {
                        return;
                    }
                    targetAngle = moduloAngle(targetAngle);

                    beetle.lastBrainActive = performance.now();
                    beetle.targetAngle = targetAngle;
                    if (uint8 == 1) {
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
                } else if (data.type === 'play' && beetleId !== null && !game.beetles.has(beetleId)) {
                    const beetle = initializeBeetle(beetleId, false);
                    game.beetles.set(beetleId, beetle);
                }

                if (isLooks(data.looks) && beetleId !== null) {
                    game.looksMap.set(game.resolveGlobalId(beetleId), data.looks);
                    game.looksMapIdEdits.push(game.resolveGlobalId(beetleId));
                }
            } catch (e) {
                console.log(e);
            }
        });

        let sentFirstMessage: boolean = false;
        const updateFn = () => {
            const beetle = beetleId === null ? undefined : game.beetles.get(beetleId);

            const msg: Message = {
                beetles: Array.from(game.beetles.values()).map(b => {
                    return {
                        x: b.x,
                        y: b.y,
                        angle: b.angle,
                        size: b.size,
                        score: b.score,
                        targetAngle: b.targetAngle,
                        globId: game.resolveGlobalId(b.id)
                    }
                }),
                rubys: Array.from(game.rubys.values()).map(r => {
                    return {
                        id: r.id,
                        x: r.x,
                        y: r.y,
                        baseSize: r.baseSize,
                        hp: r.hp,
                        protection: r.protectionTicks / rubyProtectionTicks
                    }
                }),
                newPoints: game.pointIdCreations.map(id => {
                    const pos = game.points.get(id) as [number, number, boolean];
                    return [id, pos[0], pos[1]];
                }),
                removedPoints: game.pointIdRemovals.map(el => {
                    return [el.id, el.animation[0], el.animation[1]];
                }),
                globId: beetle ? game.resolveGlobalId(beetle.id) : ''
            };

            if (!sentFirstMessage) {
                msg.looks = Object.fromEntries(game.looksMap);

                msg.newPoints = [];
                msg.removedPoints = [];

                game.points.forEach((pos, id) => {
                    msg.newPoints.push([id, pos[0], pos[1]])
                });
            } else if (game.looksMapIdEdits.length > 0) {
                msg.looks = {};

                for (let i = 0; i < game.looksMapIdEdits.length; i++) {
                    const idd = game.looksMapIdEdits[i];
                    const look = game.looksMap.get(idd);
                    if (look !== undefined) {
                        msg.looks[idd] = look;
                    }
                }
            }

            sentFirstMessage = true;

            ws.send(JSON.stringify(msg));
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
