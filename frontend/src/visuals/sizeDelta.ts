import { expLerp, lerp } from "../../../shared/utils";
import { Interpolator } from "../interpolator";
import type { RenderInfo } from "../renderInfo";

export class SizeDelta {
    vsize = new Interpolator(0, false);
    interpolatedVsize = 0;
    arrowX = 0;
    arrowXAdd = 0;

    update(vsize: number) {
        this.vsize.update(vsize);
    }

    render(renderInfo: RenderInfo) {
        const { ctx, w, h, dt } = renderInfo;

        this.vsize.onRender();

        const target = (this.vsize.value > 0 ? 1 : -1) * Math.pow(Math.abs(this.vsize.value), 2) * 10;
        this.interpolatedVsize = expLerp(this.interpolatedVsize, target, dt, 0.01);

        const mag = Math.abs(this.interpolatedVsize);
        const green = this.interpolatedVsize < 0;
        // const green = true;
        // const mag = 0.02;
        if(mag < 0.0002) {
            this.arrowX = 0;
            this.arrowXAdd = 0;
            return;
        }

        const strength = mag * 4;
        const alpha = strength / (strength + 1);
        if(green) {
            ctx.fillStyle = 'rgba(25,223,68,' + alpha + ')';
        } else {
            ctx.fillStyle = 'rgba(223,68,25,' + alpha + ')';
        }
        ctx.fillRect(0, 0, w, h);
        
        this.arrowX = expLerp(this.arrowX, 1, dt, 0.005);
        this.arrowXAdd += dt * 0.0004;
        const arrowX = (this.arrowX + Math.min(1, this.arrowXAdd)) / 2;

        const strength2 = mag * 12;
        const alpha2 = strength2 / (strength2 + 1);
        if(green) {
            ctx.fillStyle = 'rgba(25,223,68,' + alpha2 + ')';
        } else {
            ctx.fillStyle = 'rgba(223,68,25,' + alpha2 + ')';
        }
        ctx.fillRect(0, 0, w, h);

        const cx = w / 2;
        const cy = h / 2;
        const sz = (w + h) / 2;
        const len = sz * lerp(0.04, 0.12, arrowX);
        const margin = green ? sz * lerp(0.0, 0.04, arrowX) : sz * lerp(0.2, 0.08, arrowX);
        for(let i = 0; i < 8; i ++) {
            const angle = Math.PI * (i + 0.5) / 4;
            this.drawArrow(
                ctx,
                cx + (cx - margin) * Math.cos(angle) * (green ? -1 : 1),
                cy + (cy - margin) * Math.sin(angle) * (green ? -1 : 1),
                Math.cos(angle),
                Math.sin(angle),
                sz * 0.015,
                len
            );
        }
    }

    drawArrow(ctx: CanvasRenderingContext2D, x: number, y: number, dx: number, dy: number, w: number, len: number) {
        ctx.beginPath();
        ctx.moveTo(x - dy * w, y + dx * w);
        ctx.lineTo(x - dy * w + dx * len, y + dx * w + dy * len);
        ctx.lineTo(x - dy * w * 2 + dx * len, y + dx * w * 2 + dy * len);
        ctx.lineTo(x + dx * (len + w * 2.5), y + dy * (len + w * 2.5));
        ctx.lineTo(x + dy * w * 2 + dx * len, y - dx * w * 2 + dy * len);
        ctx.lineTo(x + dy * w + dx * len, y - dx * w + dy * len);
        ctx.lineTo(x + dy * w, y - dx * w);
        ctx.fill();
    }
}
