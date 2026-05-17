import type { VisionBounds } from "../../shared/visionBounds";

export interface RenderInfo {
    ctx: CanvasRenderingContext2D;
    prevT: number;
    t: number;
    w: number;
    h: number;
    scale: number;
    bounds: VisionBounds;
}
