import type { MessageObstacle } from "../../../shared/dataEncoders";
import { lerp } from "../../../shared/utils";
import { Interpolator } from "../interpolator";
import type { RenderInfo } from "../types";
import { ObstacleDestructionParticle, randomRepeat, type ParticleSystem } from "../visuals/particleSystem";

export class LocalObstacle {
    id: number;
    isAggressive: boolean;
    isCircle: boolean;

    x1: Interpolator;
    y1: Interpolator;
    x2: Interpolator;
    y2: Interpolator;
    size: Interpolator;
    timeExisting: number;

    toothCount: number;
    toothOffset: number;

    constructor(o: MessageObstacle) {
        this.id = o.id;
        this.isAggressive = o.isAggressive;
        this.isCircle = o.isCircle;
        this.x1 = new Interpolator(o.x1, false);
        this.y1 = new Interpolator(o.y1, false);
        this.x2 = new Interpolator(o.x2, false);
        this.y2 = new Interpolator(o.y2, false);
        this.size = new Interpolator(o.size, false);
        this.timeExisting = 0;

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

    private spawnParticles(particleSystem: ParticleSystem, dt: number) {
        const mapSize = parseInt(import.meta.env.VITE_MAP_SIZE);
        
        if(this.isCircle) {
            const x0 = this.x1.value;
            const y0 = this.y1.value;
            const r0 = this.size.value;

            const x1 = 0;
            const y1 = 0;
            const r1 = mapSize;

            const dx = x1 - x0;
            const dy = y1 - y0;
            const d = Math.sqrt(dx * dx + dy * dy);
            const ndx = dx / d;
            const ndy = dy / d;

            if (d > r0 + r1) return;
            if (d < Math.abs(r0 - r1)) return;
            if (d === 0 && r0 === r1) return;

            const a = (r0 * r0 - r1 * r1 + d * d) / (2 * d);
            const h = Math.sqrt(r0 * r0 - a * a);

            const xm = x0 + a * ndx;
            const ym = y0 + a * ndy;

            const rx = -ndy * h;
            const ry = ndx * h;

            // intersection points:
            const p1x = xm + rx;
            const p1y = ym + ry;
            const p2x = xm - rx;
            const p2y = ym - ry;

            randomRepeat(() => {
                const t = Math.random();

                const x = lerp(p1x, p2x, t);
                const y = lerp(p1y, p2y, t);
                const norm = Math.sqrt(x * x + y * y);

                const nx = x / norm;
                const ny = y / norm;

                particleSystem.addParticle(new ObstacleDestructionParticle(nx * mapSize, ny * mapSize));
            }, h * Math.min(100, dt) * 0.03);
        } else {
            const x1 = this.x1.value;
            const y1 = this.y1.value;
            const x2 = this.x2.value;
            const y2 = this.y2.value;

            const maxd = mapSize + (Math.random() > 0.5 ? 1 : -1) * this.size.value;
            const dx = x2 - x1;
            const dy = y2 - y1;

            const a = dx * dx + dy * dy;
            const b = 2 * (x1 * dx + y1 * dy);
            const c = x1 * x1 + y1 * y1 - maxd * maxd;

            const discriminant = b * b - 4 * a * c;
            if (discriminant < 0) return;

            const considerT = (t: number) => {
                if (0 <= t && t <= 1) {
                    randomRepeat(() => {
                        const t2 = Math.random() * 2 - 1;

                        const x = x1 + t * dx;
                        const y = y1 + t * dy;
                        const norm = Math.sqrt(x * x + y * y);

                        const nx = x / norm;
                        const ny = y / norm;

                        particleSystem.addParticle(new ObstacleDestructionParticle(nx * mapSize - ny * t2, ny * mapSize + nx * t2));
                    }, Math.min(100, dt) * 0.12);
                }
            };
            
            const sqrtD = Math.sqrt(discriminant);
            considerT((-b - sqrtD) / (2 * a));
            considerT((-b + sqrtD) / (2 * a));
        }
    }

    render(renderInfo: RenderInfo) {
        const { ctx, t, prevT, particleSystem } = renderInfo;

        this.spawnParticles(particleSystem, t - prevT);

        this.x1.onRender();
        this.y1.onRender();
        this.x2.onRender();
        this.y2.onRender();
        this.size.onRender();
        this.timeExisting += t - prevT;

        ctx.globalAlpha = Math.min(1, Math.pow(this.timeExisting / 300, 4));
        const color1 = 'rgb(225,231,231)';
        const color2 = 'rgb(136,146,146)';

        if (this.isCircle) {
            const x = this.x1.value;
            const y = this.y1.value;
            const r = this.size.value;

            if (this.isAggressive) {
                ctx.lineWidth = 0.15;
                ctx.fillStyle = color1;
                ctx.strokeStyle = color2;
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
                    ctx.fillStyle = color2;
                    ctx.beginPath();
                    ctx.arc(x, y, r, 0, Math.PI * 2);
                    ctx.fill();

                    ctx.fillStyle = color1;
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
                ctx.fillStyle = color1;
                ctx.strokeStyle = color2;
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
                    ctx.strokeStyle = color2;
                    ctx.lineWidth = r * 2;
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();

                    ctx.strokeStyle = color1;
                    ctx.lineWidth = r * 2 - 0.15;
                    ctx.beginPath();
                    ctx.moveTo(x1, y1);
                    ctx.lineTo(x2, y2);
                    ctx.stroke();
                });
            }
        }
        ctx.globalAlpha = 1;
    }
}
