import type { VisionBounds } from "../../shared/visionBounds";
import type { ParticleSystem } from "./visuals/particleSystem";

export interface RenderInfo {
    ctx: CanvasRenderingContext2D;
    prevT: number;
    t: number;
    w: number;
    h: number;
    scale: number;
    centerX: number;
    centerY: number;
    bounds: VisionBounds;
    particleSystem: ParticleSystem;
}
