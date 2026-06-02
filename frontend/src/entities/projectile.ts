import type { MessageProjectile } from "../../../shared/dataEncoders";
import { Interpolator } from "../interpolator";
import type { RenderInfo } from "../renderInfo";

export function renderProjectile(rednerInfo: RenderInfo, prx: number, pry: number, angle: number, alpha: number) {
    const { ctx } = rednerInfo;

    ctx.strokeStyle = 'rgba(7,89,95,' + alpha + ')';
    ctx.beginPath();
    ctx.lineWidth = 0.08;
    for (let i = 0; i < 4; i++) {
        const theta = angle + Math.PI / 4 * i;
        ctx.moveTo(prx + Math.cos(theta) * 0.3, pry + Math.sin(theta) * 0.3);
        ctx.lineTo(prx - Math.cos(theta) * 0.3, pry - Math.sin(theta) * 0.3);
    }
    ctx.stroke();
}

export class Projectile {
    id: number;
    x: Interpolator;
    y: Interpolator;
    removed = false;
    aliveT = 0;
    removedT = 0;

    constructor(p: MessageProjectile) {
        this.id = p.id;
        this.x = new Interpolator(p.x, false);
        this.y = new Interpolator(p.y, false);
    }

    update(p: MessageProjectile) {
        this.x.update(p.x);
        this.y.update(p.y);
    }

    render(renderInfo: RenderInfo) {
        const { t, prevT } = renderInfo;

        this.x.onRender();
        this.y.onRender();
        this.aliveT += t - prevT;
        if(this.removed) {
            this.removedT += t - prevT;
        }

        renderProjectile(renderInfo, this.x.value, this.y.value, this.aliveT / 1000 * 8, Math.max(0, 1 - this.removedT / 250));
    }

    canRemove() {
        return this.removedT > 300;
    }
}