import WebSocket, { WebSocketServer } from "ws";
import { looksEntryEncoder, type LooksEntry } from "../shared/looks.js";
import env from "./env.js";
import type { Game } from "./game.js";
import type { IncomingMessage } from "http";
import { Beetle } from "./entities/beetle.js";
import { 
    beetleEncoder, headerEncoder, leaderboardEntryEncoder, obstacleEncoder, pointCreationEncoder, pointRemovalEncoder, rubyEncoder, particleEncoder,
    clientPlayEncoder, clientUpdateEncoder, getClientRegisterEncoder, 
    type LeaderboardEntry, 
    clientRegisterId, clientPlayId, clientUpdateId
} from "../shared/dataEncoders.js";
import { moduloAngle } from "../shared/utils.js";
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

const clientRegisterEncoder = getClientRegisterEncoder(parseInt(env('VITE_ID_LENGTH')));

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
                if (!isBinary) return;

                const buffer = rawData as Buffer;
                const view = new PointedDataView(new DataView(
                    buffer.buffer,
                    buffer.byteOffset,
                    buffer.byteLength
                ));

                const msgTypeId = view.view.getUint8(0);
                view.pointer++;

                if(msgTypeId == clientRegisterId) {
                    const msg = clientRegisterEncoder.readFromBuffer(view);
                    if(beetleId === null) {
                        beetleId = msg.id;
                    }
                } else if(msgTypeId == clientPlayId) {
                    const msg = clientPlayEncoder.readFromBuffer(view);

                    if (beetleId === null) return;
                    if(game.beetles.has(beetleId)) return;

                    const beetle = new Beetle(beetleId, false, game, msg.powerupType, msg.looks);
                    game.beetles.set(beetleId, beetle);
                } else if(msgTypeId == clientUpdateId) {
                    const msg = clientUpdateEncoder.readFromBuffer(view);

                    if (beetleId === null) return;
                    const beetle = game.beetles.get(beetleId);
                    if (beetle === undefined) return;
                    
                    beetle.lastBrainActive = performance.now();
                    beetle.targetAngle = moduloAngle(msg.targetAngle);
                    if (msg.clickMode == 1) {
                        beetle.clicked = true;
                        beetle.poweruping = false;
                    } else if(msg.clickMode == 2) {
                        beetle.poweruping = true;
                        beetle.clicked = false;
                    } else if(msg.clickMode == 3) {
                        beetle.poweruping = false;
                        beetle.clicked = false;
                    }
                }
            } catch (e) {
                // TODO: potentially remove this in the future?
                console.log(e);
            }
        });

        let numMessages = 0;
        const updateFn = () => {
            if(beetleId === null) return;  // Only send messages after client registers
            const beetle = game.beetles.get(beetleId);

            const centerX = beetle ? beetle.x : 0;
            const centerY = beetle ? beetle.y : 0;
            const visibleArea = getVisibleArea(beetle ? beetle.size : null);
            const bounds = getVisionBoundsFromCenter(centerX, centerY, visibleArea * defaultAspect, visibleArea);

            const beetlesToSend = filterMapValues(game.beetles, b => b.filterMessage(bounds));
            const rubysToSend = filterMapValues(game.rubys, r => r.filterMessage(bounds));
            const obstaclesToSend = filterMapValues(game.obstacles, o => o.filterMessage(bounds));
            const particlesToSend = game.particles.filter(p => p.filterMessage(bounds, beetle ? beetle.globId : -1));

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
                motionBlur: beetle ? beetle.getUint8MotionBlur() : 0,
                numBeetles: beetlesToSend.length,
                numRubys: rubysToSend.length,
                numObstacles: obstaclesToSend.length,
                numParticles: particlesToSend.length,
                numPointCreations: numMessages == 0 ? game.points.size : game.pointCreations.length,
                numPointRemovals: numMessages == 0 ? 0 : game.pointRemovals.length,
                numLooks: looksToSend.length,
                numLeaderboardEntries: leaderboardData.length,
            }

            const buffer = Buffer.alloc(
                headerEncoder.bytes +
                header.numBeetles * beetleEncoder.bytes +
                header.numRubys * rubyEncoder.bytes +
                header.numObstacles * obstacleEncoder.bytes +
                header.numParticles * particleEncoder.bytes +
                header.numPointCreations * pointCreationEncoder.bytes +
                header.numPointRemovals * pointRemovalEncoder.bytes +
                header.numLooks * looksEntryEncoder.bytes + numNicknameStringBytes +
                header.numLeaderboardEntries * leaderboardEntryEncoder.bytes
            );
            const view = new PointedDataView(new DataView(
                buffer.buffer,
                buffer.byteOffset,
                buffer.byteLength
            ));

            headerEncoder.writeToBuffer(view, header);
            beetlesToSend.forEach(b => b.writeToBuffer(view));
            rubysToSend.forEach(r => r.writeToBuffer(view));
            obstaclesToSend.forEach(o => o.writeToBuffer(view));
            particlesToSend.forEach(p => p.writeToBuffer(view));

            if (numMessages == 0) {
                game.points.forEach(p => {
                    pointCreationEncoder.writeToBuffer(view, p);
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
