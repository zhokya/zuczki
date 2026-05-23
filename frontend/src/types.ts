import type { VisionBounds } from "../../shared/visionBounds";
import type { particleSystem } from "./visuals/particleSystem";

export interface RenderInfo {
    ctx: CanvasRenderingContext2D;
    prevT: number;
    t: number;
    w: number;
    h: number;
    scale: number;
    bounds: VisionBounds;
    particleSystem: particleSystem;
}
