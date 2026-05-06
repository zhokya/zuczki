import { expLerp } from "../../../shared";

export class LocalPoint {
    id: number;

    tx: number;
    ty: number;
    to: number;

    x: number;
    y: number;
    o: number;

    removed = false;
    removedTime = 0;

    constructor(el: [number, number, number]) {
        this.id = el[0];
        this.tx = el[1];
        this.ty = el[2];
        this.to = 1;

        const ang = Math.random() * Math.PI * 2;
        this.x = this.tx + Math.cos(ang) * 1.2;
        this.y = this.ty + Math.sin(ang) * 1.2;
        this.o = 0;
    }

    remove(el: [number, number, number]) {
        this.tx = el[1];
        this.ty = el[2];
        this.to = 0;
        this.removed = true;
    }

    render(prevTimestep: number, timestep: number, ctx: CanvasRenderingContext2D) {
        const dt = timestep - prevTimestep;

        this.x = expLerp(this.x, this.tx, dt, 0.005);
        this.y = expLerp(this.y, this.ty, dt, 0.005);
        this.o = expLerp(this.o, this.to, dt, 0.02);

        ctx.fillStyle = 'rgba(192, 64, 0, ' + this.o + ')';
        ctx.fillRect(this.x - 0.1, this.y - 0.1, 0.2, 0.2);

        if (this.removed) {
            this.removedTime += dt;
        }
    }
}
