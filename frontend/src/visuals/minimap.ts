import { colors } from "../../../shared/looks";
import type { LocalBeetle } from "../entities/beetle";
import { mapSize } from "../mainCanvas";
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

    const defaultMapSize = import.meta.env.VITE_MAP_SIZE;
    const currentMapSize = mapSize.value;
    // (((currentMapSize - selfBeetle.size.value) / (defaultMapSize - selfBeetle.size.value) * (minimapSize - dotSize))) + dotSize = minimapSize - redEdgeSize
    // redEdgeSize = minimapSize - dotSize - (currentMapSize - selfBeetle.size.value) / (defaultMapSize - selfBeetle.size.value) * (minimapSize - dotSize)
    const redEdgeSize = minimapSize - dotSize - (currentMapSize - selfBeetle.size.value) / (defaultMapSize - selfBeetle.size.value) * (minimapSize - dotSize);
    ctx.strokeStyle = 'rgba(220,50,70,' + (Math.min(1, redEdgeSize / 5) * 0.7) + ')';
    ctx.lineWidth = redEdgeSize;
    ctx.beginPath();
    ctx.arc(x, y, minimapSize - redEdgeSize / 2, 0, Math.PI * 2);
    ctx.stroke();

    ctx.fillStyle = colors[chosenLooks.mainColor];
    ctx.shadowBlur = 4;
    ctx.shadowColor = 'rgb(0,0,0)';
    ctx.beginPath();
    ctx.arc(
        x + selfBeetle.x.value / (defaultMapSize - selfBeetle.size.value) * (minimapSize - dotSize),
        y + selfBeetle.y.value / (defaultMapSize - selfBeetle.size.value) * (minimapSize - dotSize),
        dotSize, 0, Math.PI * 2
    );
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.shadowColor = 'rgba(0,0,0,0)';
}