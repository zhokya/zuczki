import type { RenderInfo } from "../types";

const mapSize = parseInt(import.meta.env.VITE_MAP_SIZE);

export function renderEnvironment(renderInfo: RenderInfo) {
    const { ctx } = renderInfo;

    ctx.strokeStyle = 'red';
    ctx.lineWidth = 0.1;
    ctx.beginPath();
    ctx.arc(0, 0, mapSize, 0, Math.PI * 2);
    ctx.stroke();
}
