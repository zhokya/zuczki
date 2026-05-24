import { colors } from "../../../shared/looks";
import type { LocalBeetle } from "../entities/beetle";
import { chosenLooks } from "../menu";
import type { RenderInfo } from "../types";

export function renderMinimap(renderInfo: RenderInfo, selfBeetle: LocalBeetle) {
    const { ctx, w } = renderInfo;

    ctx.strokeStyle = 'rgba(90,70,80,.7)';
    ctx.fillStyle = 'rgba(255,255,255,.3)';
    ctx.lineWidth = 2;

    const minimapSize = 40;
    const minimapMargin = 10;
    const x = w - minimapMargin - minimapSize;
    const y = minimapMargin + minimapSize;
    const dotSize = 4;

    ctx.beginPath();
    ctx.arc(x, y, minimapSize, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y, minimapSize, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = colors[chosenLooks.mainColor];
    ctx.shadowBlur = 4;
    ctx.shadowColor = 'rgb(0,0,0)';
    ctx.beginPath();
    ctx.arc(
        x + selfBeetle.x.value / import.meta.env.VITE_MAP_SIZE * (minimapSize - dotSize),
        y + selfBeetle.y.value / import.meta.env.VITE_MAP_SIZE * (minimapSize - dotSize),
        dotSize, 0, Math.PI * 2
    );
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'rgba(0,0,0,0)';
}