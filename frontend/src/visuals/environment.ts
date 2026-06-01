import { mapSize } from "../mainLoop";
import type { RenderInfo } from "../types";

const redAreaSize = 20;
const redAreaColor = 'rgb(240,170,190)';

export function renderBeforeTransform(renderInfo: RenderInfo) {
    const { ctx, w, h } = renderInfo;

    ctx.fillStyle = redAreaColor;
    ctx.fillRect(0, 0, w, h);
}

export function renderEnvironment(renderInfo: RenderInfo) {
    const { ctx } = renderInfo;

    ctx.fillStyle = 'rgb(250,250,250)';
    ctx.beginPath();
    ctx.arc(0, 0, mapSize.value, 0, Math.PI * 2);
    ctx.fill();
}

export function renderWorldEdge(renderInfo: RenderInfo) {
    const { ctx } = renderInfo;

    ctx.strokeStyle = redAreaColor;
    ctx.lineWidth = redAreaSize;
    ctx.beginPath();
    ctx.arc(0, 0, mapSize.value + redAreaSize / 2, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = 'rgb(220,50,70)';
    ctx.lineWidth = 0.1;
    ctx.beginPath();
    ctx.arc(0, 0, mapSize.value, 0, Math.PI * 2);
    ctx.stroke();
}
