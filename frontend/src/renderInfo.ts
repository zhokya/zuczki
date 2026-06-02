import type { VisionBounds } from "../../shared/visionBounds";
import type { ParticleSystem } from "./visuals/particleSystem";

export class RenderInfo {
    ctx;
    prevT;
    t;
    w;
    h;
    scale;
    centerX;
    centerY;
    bounds;
    particleSystem;

    dt: number;
    exp005: number; // for expLerp optimization
    exp02: number;

    constructor(
        ctx: CanvasRenderingContext2D,
        prevT: number,
        t: number,
        w: number,
        h: number,
        scale: number,
        centerX: number,
        centerY: number,
        bounds: VisionBounds,
        particleSystem: ParticleSystem,
    ) {
        this.ctx = ctx;
        this.prevT = prevT;
        this.t = t;
        this.w = w;
        this.h = h;
        this.scale = scale;
        this.centerX = centerX;
        this.centerY = centerY;
        this.bounds = bounds;
        this.particleSystem = particleSystem;

        this.dt = t - prevT;
        this.exp005 = Math.exp(-0.005 * this.dt);
        this.exp02 = Math.exp(-0.02 * this.dt);
    }
}
