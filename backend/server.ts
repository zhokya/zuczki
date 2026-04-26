import { WebSocketServer } from "ws";
import { beetles, looksMap } from "./manager.ts";
import { generateId, type Looks, type Message } from "../shared/index.ts";
import env from "./env.ts";
import { initializeBeetle } from "./logic.ts";

export function isLooks(obj: any): obj is Looks {
    return (
        typeof obj === "object" &&
        obj !== null &&
        typeof obj.mainColor === "string" &&
        typeof obj.insideColor === "string" &&
        typeof obj.antennaColor === "string" &&
        typeof obj.antennaSize === "number" &&
        typeof obj.nickname === "string"
    );
}

var looksMapGlobalRev = 0;
const wss = new WebSocketServer({ port: 6767 });

const updateFns: (() => void)[] = [];
const globIdMap = new Map<string, string>();

function resolveGlobalId(id: string): string {
    let globId = globIdMap.get(id);
    if (globId === undefined) {
        globId = generateId(parseInt(env('VITE_ID_LENGTH')));
        globIdMap.set(id, globId);
    }
    if (!looksMap.has(globId)) {
        looksMap.set(globId, {
            mainColor: 'red',
            insideColor: 'blue',
            antennaColor: 'green',
            antennaSize: 0.5,
            antennaDots: true,
            nickname: id + '-' + globId
        });
        looksMapGlobalRev = (looksMapGlobalRev + 1) % 1000000000;
    }
    return globId;
}

wss.on('connection', (ws) => {
    var beetleId: string | null = null;
    var looksMapRev = -1;

    ws.on('message', (rawData, isBinary) => {
        try {
            if (isBinary) {
                if (beetleId === null) return;
                const beetle = beetles.get(beetleId);
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
                targetAngle = targetAngle % (Math.PI * 2);
                if (targetAngle < 0) {
                    targetAngle += Math.PI * 2;
                }

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
                if (typeof (id) == 'string' && id.length === parseInt(env('ID_LENGTH'))) {
                    beetleId = id;
                }
            } else if (data.type === 'looks') {
                if (beetleId === null) return;
                const looks = data.looks;
                if (isLooks(looks)) {
                    looksMap.set(beetleId, looks);
                    looksMapGlobalRev = (looksMapGlobalRev + 1) % 1000000000;
                }
            } else if (data.type === 'play') {
                if (beetleId === null) return;
                if (beetles.has(beetleId)) return;
                const beetle = initializeBeetle(beetleId, false);
                beetles.set(beetleId, beetle);
            }
        } catch { }
    });

    const updateFn = () => {
        const msg: Message = {
            beetles: Array.from(beetles.values()).map(b => {
                return {
                    x: b.x,
                    y: b.y,
                    angle: b.angle,
                    size: b.size,
                    score: b.score,
                    targetAngle: b.targetAngle,
                    globId: resolveGlobalId(b.id),
                    self: b.id === beetleId
                }
            })
        };

        if (looksMapRev !== looksMapGlobalRev) {
            looksMapRev = looksMapGlobalRev;
            msg['looks'] = Object.fromEntries(looksMap);
        }

        ws.send(JSON.stringify(msg));
    }
    updateFns.push(updateFn);

    ws.on('close', () => {
        const index = updateFns.findIndex(fn => fn === updateFn);
        if (index !== -1) {
            updateFns.splice(index, 1);
        }
    });
});

export function sendMessages() {
    updateFns.forEach(fn => {
        fn();
    })
}
