import { expLerp, type MessageRuby } from "../../../shared";
import { Interpolator } from "../interpolator";
import type { RenderInfo } from "../types";

export class LocalRuby {
    id: number;

    x: Interpolator;
    y: Interpolator;
    protection: Interpolator;

    hp: number;
    baseSize: number;

    visibleHp: number;
    opacity = 1;
    removed = false;

    constructor(el: MessageRuby) {
        this.id = el.id;

        this.x = new Interpolator(el.x, false);
        this.y = new Interpolator(el.y, false);
        this.protection = new Interpolator(el.protection, false);

        this.hp = el.hp;
        this.visibleHp = el.hp;
        this.baseSize = el.baseSize;
    }

    update(el: MessageRuby) {
        this.x.update(el.x);
        this.y.update(el.y);
        this.protection.update(el.protection);

        this.hp = el.hp;
        this.baseSize = el.baseSize;
    }

    render(renderInfo: RenderInfo) {
        const { ctx, t, prevT } = renderInfo;

        if (this.removed) {
            this.hp = 0;
            this.opacity -= (t - prevT) * 0.005;
        }

        this.x.onRender();
        this.y.onRender();
        this.protection.onRender();
        this.visibleHp = expLerp(this.visibleHp, this.hp, t - prevT, 0.004);

        const path = new Path2D();
        path.arc(this.x.value, this.y.value, this.baseSize * this.visibleHp, 0, Math.PI * 2);

        ctx.fillStyle = 'rgba(255,0,0,' + this.opacity + ')';
        ctx.fill(path);

        if (this.protection.value > 0.001) {
            ctx.lineWidth = this.protection.value * 0.15;
            ctx.strokeStyle = 'cyan';
            ctx.stroke(path);
        }
    }

    renderHpBar(renderInfo: RenderInfo) {
        const { ctx } = renderInfo;

        const w = 0.7;
        const h = 0.2;

        ctx.fillStyle = 'rgba(128,128,128,' + this.opacity + ')';
        ctx.fillRect(this.x.value - w / 2, this.y.value - this.baseSize * this.visibleHp - h * 1.5, w, h);

        ctx.fillStyle = 'rgba(0,255,0,' + this.opacity + ')';
        ctx.fillRect(this.x.value - w / 2, this.y.value - this.baseSize * this.visibleHp - h * 1.5, w * this.visibleHp, h);
    }
}
