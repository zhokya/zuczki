import { lerp } from "../../../shared/utils";
import type { RenderInfo } from "../renderInfo";

const maxSize = parseFloat(import.meta.env.VITE_MAX_SIZE);
const minSize = maxSize - 0.6;

let warningT = 0;
export function renderSizeWarning(renderInfo: RenderInfo, size: number) {
    const { ctx, w, h, t, prevT } = renderInfo;

    if (size <= minSize) return;
    const amtt = (size - minSize) / (maxSize - minSize);
    const am = (Math.pow(amtt, 4) + Math.pow(amtt, 1 / 4)) / 2;

    const speed = lerp(0.001, 0.04, am);
    warningT += speed * (t - prevT);

    const opacity = (Math.sin(warningT) + 1) / 2 * am * 0.3;

    const gradient = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, Math.sqrt(w * w + h * h) / 2);
    gradient.addColorStop((1 - am) * 0.5, 'transparent');
    gradient.addColorStop(0.9, 'rgba(255,0,0,' + opacity + ')');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
}
