import { VisionBounds } from "../../../shared/visionBounds";
import { Beetle } from "../entities/beetle";
import { RenderInfo } from "../renderInfo";
import { ParticleSystem } from "../visuals/particleSystem";
import { chosenLooks } from "./looks";
import { aliveT } from "./menu";

const c = document.getElementById('small-canvas') as HTMLCanvasElement;
const ctx = c.getContext('2d') as CanvasRenderingContext2D;

const w = c.width;
const h = c.height;

let prevT: number | null = null;
const particleSystem = new ParticleSystem();
const menuBeetle = new Beetle({
    x: w * 0.5,
    y: h * 0.58,
    size: w * 0.36,
    angle: -Math.PI / 2,
    targetAngle:  -Math.PI / 2,
    powerupTicks: 0,
    score: 0,
    id: -1,
    powerupNumber: -1
});
export function smallCanvasRenderLoop(t: number) {
    requestAnimationFrame(smallCanvasRenderLoop);

    if (prevT === null) {
        prevT = t;
    }

    if (aliveT < 1000) {
        ctx.clearRect(0, 0, w, h);

        const bounds = new VisionBounds(0, 0, w, h);
        const scale = 1;
        const centerX = w / 2;
        const centerY = h / 2;
        const renderInfo = new RenderInfo(ctx, prevT, t, w, h, scale, centerX, centerY, bounds, particleSystem);
        menuBeetle.render(renderInfo, chosenLooks);
    }

    prevT = t;
}
