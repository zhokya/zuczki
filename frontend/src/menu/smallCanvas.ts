import { VisionBounds } from "../../../shared/visionBounds";
import { LocalBeetle } from "../entities/beetle";
import { aliveT } from "../mainCanvas";
import type { RenderInfo } from "../types";
import { ParticleSystem } from "../visuals/particleSystem";
import { chosenLooks } from "./looks";

const c = document.getElementById('small-canvas') as HTMLCanvasElement;
const ctx = c.getContext('2d') as CanvasRenderingContext2D;

const w = c.width;
const h = c.height;

let prevT: number | null = null;
export 
const particleSystem = new ParticleSystem();
const menuBeetle = new LocalBeetle({
    x: w * 0.5,
    y: h * 0.64,
    size: w * 0.33,
    angle: -Math.PI / 2,
    targetAngle:  -Math.PI / 2,
    powerupTicks: 0,
    score: 0,
    globId: -1,
    powerupNumber: -1
});
export function menuRenderLoop(t: number) {
    requestAnimationFrame(menuRenderLoop);

    if (prevT === null) {
        prevT = t;
    }

    if (aliveT < 1000) {
        ctx.clearRect(0, 0, w, h);

        const bounds = new VisionBounds(0, 0, w, h);
        const renderInfo: RenderInfo = { ctx, w, h, prevT, t, scale: 1, bounds, particleSystem, centerX: w / 2, centerY: h / 2 };
        menuBeetle.render(renderInfo, chosenLooks);
    }

    prevT = t;
}
