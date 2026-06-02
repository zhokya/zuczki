import type { PointCreation, PointRemoval } from "../../../shared/dataEncoders";
import { lerp } from "../../../shared/utils";
import { quality } from "../menu/quality";
import type { RenderInfo } from "../renderInfo";

export class Point {
    id: number;

    tx: number;
    ty: number;
    to: number;

    x: number;
    y: number;
    o: number;

    removed = false;
    removedTime = 0;

    h: number;
    s: number;
    l: number;
    speed: number;
    phase: number;
    size: number;
    lowQSize: number;
    lowQO: number;

    constructor(el: PointCreation) {
        this.id = el.id;
        this.tx = el.x;
        this.ty = el.y;
        this.to = 1;

        const ang = Math.random() * Math.PI * 2;
        this.x = this.tx + Math.cos(ang) * 1.2;
        this.y = this.ty + Math.sin(ang) * 1.2;
        this.o = 0;

        this.h = Math.floor(Math.random() * 360);
        this.s = Math.floor(Math.random() * 10 + 55);
        this.l = Math.floor(Math.random() * 10 + 45);

        this.speed = lerp(0.001, 0.01, Math.random());
        this.phase = Math.random() * Math.PI * 2;
        this.size = lerp(0.4, 1, Math.random());
        this.lowQSize = lerp(0.7, 1.3, Math.random());
        this.lowQO = lerp(0.5, 1, Math.random());
    }

    remove(el: PointRemoval) {
        this.tx = el.x;
        this.ty = el.y;
        this.to = 0;
        this.removed = true;
    }

    canRemove() {
        return this.removedTime > 1000;
    }

    render(renderInfo: RenderInfo) {
        const { ctx, bounds, dt, exp005, exp02 } = renderInfo;
        
        if (this.removed) {
            this.removedTime += dt;
        }
        
        if(!bounds.isInsideWithMargin(this.x, this.y, quality == 0 ? 0.3 : 1.1)) return;

        // this.x = expLerp(this.x, this.tx, dt, 0.005);
        // this.y = expLerp(this.y, this.ty, dt, 0.005);
        // this.o = expLerp(this.o, this.to, dt, 0.02);
        this.x = this.tx + (this.x - this.tx) * exp005;
        this.y = this.ty + (this.y - this.ty) * exp005;
        this.o = this.to + (this.o - this.to) * exp02;

        this.phase += dt * this.speed;
        const pt = (Math.sin(this.phase) + 1) / 2;

        if(quality == 0) {
            const size = lerp(0.12, 0.2, pt) * this.lowQSize;

            ctx.fillStyle = 'hsla(' + this.h + ',' + this.s + '%,' + (this.l - 10 + Math.round(pt * 20)) + '%,' + (this.o * this.lowQO) + ')';
            ctx.beginPath();
            ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
            ctx.fill();

            return;
        }

        // ctx.shadowBlur = lerp(0.5, 0.3, pt) * scale;
        // ctx.shadowColor = 'hsla(' + this.h + ',' + (this.s + 10) + '%,' + (this.l - 20 + Math.round(pt * 20)) + '%,' + this.o + ')';
        // ctx.fillStyle = 'hsla(' + this.h + ',' + this.s + '%,' + (this.l + Math.round(pt * 20)) + '%,' + this.o + ')';
        const size = lerp(1, 0.6, pt) * this.size;
        const grad = ctx.createRadialGradient(this.x, this.y, 0.11, this.x, this.y, size);
        grad.addColorStop(0, 'hsla(' + this.h + ',' + (this.s + 20) + '%,' + (this.l + 20) + '%,' + (this.o * 0.4) + ')');
        grad.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = 'hsla(' + this.h + ',' + this.s + '%,' + (this.l - 10 + Math.round(pt * 20)) + '%,' + this.o + ')';
        ctx.beginPath();
        ctx.arc(this.x, this.y, 0.07, 0, Math.PI * 2);
        ctx.fill();
    }
}
