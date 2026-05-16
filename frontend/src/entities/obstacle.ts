import type { MessageObstacle } from "../../../shared/dataEncoders";
import { Interpolator } from "../interpolator";
import type { RenderInfo } from "../types";

export class LocalObstacle {
    id: number;
    isAggressive: boolean;
    isCircle: boolean;

    x1: Interpolator;
    y1: Interpolator;
    x2: Interpolator;
    y2: Interpolator;
    size: Interpolator;

    color1: string;
    color2: string;
    toothCount: number;
    toothOffset: number;

    constructor(o: MessageObstacle) {
        this.id = o.id;
        this.isAggressive = o.isAggressive == 1;
        this.isCircle = o.isCircle == 1;
        this.x1 = new Interpolator(o.x1, false);
        this.y1 = new Interpolator(o.y1, false);
        this.x2 = new Interpolator(o.x2, false);
        this.y2 = new Interpolator(o.y2, false);
        this.size = new Interpolator(o.size, false);

        this.color1 = '#e1e7e7';
        this.color2 = '#889292';

        let len = this.isCircle ? o.size * Math.PI * 2 : this.getCapsulePerimeter(o.size);
        this.toothCount = Math.round(2.5 * len) * 2;
        this.toothOffset = Math.random();
    }

    update(o: MessageObstacle) {
        this.x1.update(o.x1);
        this.y1.update(o.y1);
        this.x2.update(o.x2);
        this.y2.update(o.y2);
        this.size.update(o.size);
    }

    private getCapsulePerimeter(radius: number) {
        const dx = this.x1.value - this.x2.value;
        const dy = this.y1.value - this.y2.value;
        return 2 * (radius * Math.PI + Math.sqrt(dx * dx + dy * dy));
    }
    private getCapsuleEdgePoint(t: number, radius: number): [number, number, number, number] {
        const x1 = this.x1.value;
        const y1 = this.y1.value;
        const x2 = this.x2.value;
        const y2 = this.y2.value;

        t = t * this.getCapsulePerimeter(radius);

        const dx = x2 - x1;
        const dy = y2 - y1;
        const len = Math.hypot(dx, dy);

        if (len < 1e-7) {
            const a = t / radius;
            return [x1 + radius * Math.cos(a), y1 + radius * Math.sin(a), x1, y1];
        }

        const ux = dx / len;
        const uy = dy / len;
        const px = -uy;
        const py = ux;

        const topLen = len;
        const rightCapLen = Math.PI * radius;
        const bottomLen = len;
        const leftCapLen = Math.PI * radius;
        const per = topLen + rightCapLen + bottomLen + leftCapLen;

        let s = ((t % per) + per) % per;

        if (s < topLen) {
            const cx = x1 + ux * s;
            const cy = y1 + uy * s;

            return [cx + px * radius, cy + py * radius, cx, cy];
        }
        s -= topLen;

        if (s < rightCapLen) {
            const a = Math.PI / 2 - s / radius;

            return [
                x2 + ux * (radius * Math.cos(a)) + px * (radius * Math.sin(a)),
                y2 + uy * (radius * Math.cos(a)) + py * (radius * Math.sin(a)),
                x2,
                y2
            ];
        }
        s -= rightCapLen;

        if (s < bottomLen) {
            const cx = x2 - ux * s;
            const cy = y2 - uy * s;

            return [cx - px * radius, cy - py * radius, cx, cy];
        }
        s -= bottomLen;

        const a = -Math.PI / 2 + s / radius;

        return [
            x1 - ux * (radius * Math.cos(a)) + px * (radius * Math.sin(a)),
            y1 - uy * (radius * Math.cos(a)) + py * (radius * Math.sin(a)),
            x1,
            y1
        ];
    }
    private getCircleEdgePoint(t: number, radius: number): [number, number] {
        const x = this.x1.value;
        const y = this.y1.value;
        t = t * Math.PI * 2;
        return [x + radius * Math.cos(t), y + radius * Math.sin(t)];
    }
    private movePointTowards(x: number, y: number, cx: number, cy: number, t: number): [number, number] {
        const vx = x - cx;
        const vy = y - cy;
        const norm = Math.sqrt(vx * vx + vy * vy);
        const nvx = vx / norm;
        const nvy = vy / norm;
        return [x - nvx * t, y - nvy * t];
    }

    private setShadow(renderInfo: RenderInfo) {
        const { ctx, scale } = renderInfo;
        ctx.shadowBlur = scale * 0.25;
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
    }
    private unsetShadow(renderInfo: RenderInfo) {
        const { ctx } = renderInfo;
        ctx.shadowColor = 'rgba(0,0,0,0)';
        ctx.shadowBlur = 0;
    }
    private renderShadowed(renderInfo: RenderInfo, fn: () => void) {
        this.setShadow(renderInfo);
        fn();
        this.unsetShadow(renderInfo);
        fn();
    }

    render(renderInfo: RenderInfo) {
        const { ctx } = renderInfo;

        this.x1.onRender();
        this.y1.onRender();
        this.x2.onRender();
        this.y2.onRender();
        this.size.onRender();

        if (this.isCircle) {
            const x = this.x1.value;
            const y = this.y1.value;
            const r = this.size.value;

            if (this.isAggressive) {
                ctx.lineWidth = 0.15;
                ctx.fillStyle = this.color1;
                ctx.strokeStyle = this.color2;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                const path = new Path2D();
                for (let i = 0; i < this.toothCount; i++) {
                    const t = i / (this.toothCount - 2) + this.toothOffset;
                    const cr = r + (i % 2 === 0 ? 0.1 : -0.1);
                    const [x, y] = this.getCircleEdgePoint(t, cr);
                    path.lineTo(x, y);
                }

                this.renderShadowed(renderInfo, () => {
                    ctx.fill(path);
                    ctx.stroke(path);
                });
            } else {
                this.renderShadowed(renderInfo, () => {
                    ctx.fillStyle = this.color2;
                    ctx.beginPath();
                    ctx.arc(x, y, r, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.fillStyle = this.color1;
                    ctx.beginPath();
                    ctx.arc(x, y, r - 0.15, 0, Math.PI * 2);
                    ctx.fill();
                });
            }
        } else {
            const x1 = this.x1.value;
            const y1 = this.y1.value;
            const x2 = this.x2.value;
            const y2 = this.y2.value;
            const r = this.size.value;

            if (this.isAggressive) {
                ctx.lineWidth = 0.15;
                ctx.fillStyle = this.color1;
                ctx.strokeStyle = this.color2;
                ctx.lineCap = 'round';
                ctx.lineJoin = 'round';

                const path = new Path2D();
                for (let i = 0; i < this.toothCount; i++) {
                    const t = i / (this.toothCount - 2) + this.toothOffset;
                    const [x, y, cx, cy] = this.getCapsuleEdgePoint(t, r);
                    const [px, py] = this.movePointTowards(x, y, cx, cy, i % 2 === 0 ? 0.1 : -0.1);
                    path.lineTo(px, py);
                }

                this.renderShadowed(renderInfo, () => {
                    ctx.fill(path);
                    ctx.stroke(path);
                });
            } else {
                ctx.lineCap = 'round';

                this.renderShadowed(renderInfo, () => {
                    ctx.strokeStyle = this.color2;
                    ctx.lineWidth = r * 2;
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();

                    ctx.strokeStyle = this.color1;
                    ctx.lineWidth = r * 2 - 0.15;
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();
                });
            }
        }
    }
}
