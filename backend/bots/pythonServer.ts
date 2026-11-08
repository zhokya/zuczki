import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import WebSocket, { WebSocketServer } from "ws";
import { getFeaturesList, numFeatures } from "./features.js";
import type { Beetle } from "../entities/beetle.js";
import { moduloAngle } from "../../shared/utils.js";

export class PythonServer {
    private socket: WebSocket | null = null;
    readonly connected: Promise<void>;

    constructor(port: number, trainingMode: boolean) {
        const wss = new WebSocketServer({port});
        console.log(`Websocket listening on ${port}`);

        const __filename = fileURLToPath(import.meta.url);
        const __dirname = path.dirname(__filename);
        const python = spawn("python", [
            path.join(__dirname, "main.py"),
            String(port),
            String(numFeatures),
            trainingMode ? 'train' : 'inference',
        ], {
            stdio: "inherit"
        });
        python.on("exit", code => {
            console.error("Python exited", code);
            process.exit(1);
        });

        this.connected = new Promise(resolve => {
            wss.on("connection", ws => {
                this.socket = ws;
                resolve();
            });
            wss.on("close", () => {
                console.error("Python client disconnected!");
            });
        });
    }

    private waitForMessage(ws: WebSocket): Promise<Buffer> {
        return new Promise(resolve => {
            ws.once("message", data => {
                resolve(data as Buffer);
            });
        });
    }

    async getActions(features: Float32Array, lifetimeTicks: Int32Array): Promise<[Float32Array, Uint8Array, Uint8Array]> {
        const numBeetles = lifetimeTicks.length;

        const stateBytes = 4 + features.byteLength + lifetimeTicks.byteLength;

        const buffer = Buffer.allocUnsafe(stateBytes);

        let offset = 0;

        buffer.writeInt32LE(numBeetles, offset);
        offset += 4;

        Buffer.from(features.buffer, features.byteOffset, features.byteLength).copy(buffer, offset);
        offset += features.byteLength;

        Buffer.from(lifetimeTicks.buffer, lifetimeTicks.byteOffset, lifetimeTicks.byteLength).copy(buffer, offset);

        this.socket!.send(buffer);

        const response = await this.waitForMessage(this.socket!);

        const targetAngles = new Float32Array(numBeetles);
        for (let i = 0; i < numBeetles; i++) {
            targetAngles[i] = response.readFloatLE(i * 4);
        }
        const clickeds = response.subarray(numBeetles * 4, numBeetles * 5);
        const powerupings = response.subarray(numBeetles * 5, numBeetles * 6);

        return [targetAngles, clickeds, powerupings];
    }

    async updateBots(beetles: Beetle[]) {
        const [features, lifetimeTicks] = getFeaturesList(beetles);
        const [targetAngles, clickeds, powerupings] = await this.getActions(features, lifetimeTicks);
    
        for(let i = 0; i < beetles.length; i++) {
            const beetle = beetles[i];
            beetle.targetAngle = moduloAngle(targetAngles[i] + beetle.angle);
            beetle.clicked = clickeds[i] !== 0;
            beetle.poweruping = powerupings[i] !== 0;
        }
    }
}
