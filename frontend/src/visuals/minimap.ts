import type { LocalBeetle } from "../entities/beetle";
import type { RenderInfo } from "../types";

export function renderMinimap(renderInfo: RenderInfo, selfBeetle: LocalBeetle) {
    const { ctx, w } = renderInfo;

    ctx.strokeStyle = 'black';
    ctx.fillStyle = 'rgba(0,0,0,.3)'
    ctx.lineWidth = 2;

    const minimapSize = 40;
    const minimapMargin = 50;
    const dotSize = 4;

    ctx.beginPath();
    ctx.arc(w - minimapMargin, minimapMargin, minimapSize, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(w - minimapMargin, minimapMargin, minimapSize, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.arc(
        w - minimapMargin + selfBeetle.x.value / parseInt(import.meta.env.VITE_MAP_SIZE) * (minimapSize - dotSize),
        minimapMargin + selfBeetle.y.value / parseInt(import.meta.env.VITE_MAP_SIZE) * (minimapSize - dotSize),
        dotSize, 0, Math.PI * 2
    );
    ctx.fill();
}