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

    points: [number, number][] = [];

    constructor(el: MessageRuby) {
        this.id = el.id;

        this.x = new Interpolator(el.x, false);
        this.y = new Interpolator(el.y, false);
        this.protection = new Interpolator(el.protection, false);

        this.hp = el.hp;
        this.visibleHp = el.hp;
        this.baseSize = el.baseSize;

        this.points = [];
        let sinElement = Math.random();
        let count = Math.random() * 3 + 6;
        let sinPlus = ((Math.PI * 2) / count) * 0.25;
        for (let i = 0; i < count; i++) {
            sinElement += sinPlus * (Math.random() + 3.5);
            let radius = 1 + (Math.random() * 2 - 1) * 0.2;
            this.points.push([Math.sin(sinElement) * radius, Math.cos(sinElement) * radius]);
        }
        this.points.push(this.points[0]);
        this.points.push(this.points[1]);
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
        const radius = this.baseSize * this.visibleHp;
        const x = this.x.value;
        const y = this.y.value;
        path.moveTo(this.points[0][0] * radius + x, this.points[0][1] * radius + y);
        for(let i = 1; i < this.points.length; i ++) {
            path.lineTo(this.points[i][0] * radius + x, this.points[i][1] * radius + y);
        }

        if (this.protection.value > 0.001) {
            ctx.lineWidth = radius * 0.2 + this.protection.value * (radius + 0.4) * 0.2;
            ctx.strokeStyle = 'rgba(10,187,211,' + this.opacity + ')';
            ctx.stroke(path);
        }

        ctx.fillStyle = 'rgba(255,18,173,' + this.opacity + ')';
        ctx.fill(path);
        
        ctx.lineWidth = radius * 0.2;
        ctx.strokeStyle = 'rgba(202,13,139,' + this.opacity + ')';
        ctx.stroke(path);
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
