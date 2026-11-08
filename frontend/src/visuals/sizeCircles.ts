import type { RenderInfo } from "../renderInfo";

export function renderSizeCircles(renderInfo: RenderInfo) {
    const { ctx, centerX, centerY } = renderInfo;
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 0.1;
    for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.arc(centerX, centerY, (i + 1) * 10, 0, Math.PI * 2);
        ctx.stroke();
    }
}
