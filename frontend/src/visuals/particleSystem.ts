import { lerp } from "../../../shared/utils";
import type { RenderInfo } from "../types";

/*
- beetle death
*/

export function randomRepeat(fn: () => any, times: number) {
    if (Math.random() < times % 1) {
        times = Math.ceil(times);
    } else {
        times = Math.floor(times);
    }
    for (let i = 0; i < times; i++) {
        fn();
    }
}

interface IParticle {
    render(renderInfo: RenderInfo): boolean;
}

abstract class ParticleBase implements IParticle {
    abstract x: number;
    abstract y: number;
    abstract vx: number;
    abstract vy: number;
    abstract ax: number;
    abstract ay: number;
    abstract maxAliveT: number;
    aliveT = 0;

    init(r: number) {
        const angle = Math.random() * Math.PI * 2;
        return [Math.cos(angle) * r, Math.sin(angle) * r];
    }

    abstract subRender(renderInfo: RenderInfo, fract: number): void;

    getOpacity(fract: number) {
        return Math.pow(1 - fract, 1.5);
    }

    render(renderInfo: RenderInfo): boolean {
        const { ctx, t, prevT } = renderInfo;
        const dt = (t - prevT) / 1000;

        this.aliveT += dt;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.vx += this.ax * dt;
        this.vy += this.ay * dt;

        const fract = this.aliveT / this.maxAliveT;
        if(fract >= 1) return true;

        ctx.globalAlpha = this.getOpacity(fract);
        this.subRender(renderInfo, fract);
        ctx.globalAlpha = 1;
        ctx.shadowColor = 'rgba(0,0,0,0)';
        ctx.shadowBlur = 0;

        return false;
    }
}

export class ObstacleDestructionParticle extends ParticleBase {
    x; y; vx; vy; ax; ay; maxAliveT = 0.6;

    constructor(x: number, y: number) {
        super();
        
        this.x = x;
        this.y = y;

        [this.vx, this.vy] = this.init(lerp(2, 4, Math.random()));
        [this.ax, this.ay] = this.init(lerp(2, 4, Math.random()));
    }

    subRender(renderInfo: RenderInfo) {
        const { ctx, scale } = renderInfo;

        ctx.shadowColor = 'rgba(230,30,40,' + (1 - this.aliveT / 0.6) + ')';
        ctx.strokeStyle = 'rgba(255,110,80,' + (1 - this.aliveT / 0.6) + ')';
        ctx.shadowBlur = scale * 0.6;
        ctx.lineWidth = 0.1;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(this.x - this.vx * 0.1, this.y - this.vy * 0.1);
        ctx.lineTo(this.x, this.y);
        ctx.stroke();
    }
}

export class RubyParticle extends ParticleBase {
    x; y; vx; vy; ax; ay; maxAliveT;
    removal;
    baseRotation: number;
    rotationSpeed: number;

    constructor(x: number, y: number, strength: number, removal: boolean) {
        super();
        
        this.x = x;
        this.y = y;
        this.removal = removal;

        [this.vx, this.vy] = this.init(lerp(0, 3 * strength, Math.sqrt(Math.random())));
        [this.ax, this.ay] = this.init(lerp(0, 2 * strength, Math.random()));

        this.baseRotation = Math.random() * Math.PI * 2;
        this.rotationSpeed = (Math.random() * 2 - 1) * 9;

        this.maxAliveT = lerp(0.3, 0.7, Math.random()) * Math.pow(strength, 0.4);
    }

    subRender(renderInfo: RenderInfo) {
        const { ctx, scale } = renderInfo;

        if(this.removal) {
            ctx.shadowColor = 'rgb(50,90,250)';
            ctx.strokeStyle = 'rgb(140,170,250)';
        } else {
            ctx.shadowColor = 'rgb(230,80,170)';
            ctx.strokeStyle = 'rgb(255,30,190)';
        }
        ctx.shadowBlur = scale * 0.6;
        ctx.lineWidth = 0.1;
        ctx.lineCap = 'round';
        ctx.beginPath();
        for (let i = 0; i < 3; i++) {
            const angle = this.baseRotation + this.aliveT * this.rotationSpeed + i * (Math.PI * 2 / 3);
            const dx = 0.2 * Math.cos(angle);
            const dy = 0.2 * Math.sin(angle);
            ctx.moveTo(this.x + dx, this.y + dy);
            ctx.lineTo(this.x - dx, this.y - dy);
        }
        ctx.stroke();
    }
}

export class SizeIncreaseParticle extends ParticleBase {
    x; y; vx; vy; ax; ay; maxAliveT; size;
    
    constructor(x: number, y: number, strength: number) {
        super();
        
        this.x = x;
        this.y = y;
        this.size = lerp(0.3, 0.5, Math.random());

        [this.vx, this.vy] = this.init(lerp(0, 3 * strength, Math.sqrt(Math.random())));
        [this.ax, this.ay] = this.init(lerp(0, 2 * strength, Math.random()));

        this.maxAliveT = lerp(0.2, 0.6, Math.random()) * Math.pow(strength, 0.4);
    }

    subRender(renderInfo: RenderInfo, fract: number) {
        const { ctx, scale } = renderInfo;

        const size = this.size * fract * (1 - fract);

        ctx.shadowColor = 'rgb(190,60,40)';
        ctx.strokeStyle = 'rgb(250,60,40)';
        ctx.shadowBlur = scale * 0.6;
        ctx.lineWidth = size;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(this.x - size, this.y - size);
        ctx.lineTo(this.x + size, this.y + size);
        ctx.moveTo(this.x - size, this.y + size);
        ctx.lineTo(this.x + size, this.y - size);
        ctx.stroke();
    }
}

export class SizeDecreaseParticle extends ParticleBase {
    x; y; vx; vy; ax; ay; maxAliveT; size;
    
    constructor(x: number, y: number, strength: number) {
        super();
        
        this.x = x;
        this.y = y;
        this.size = lerp(0.4, 0.6, Math.random());

        [this.vx, this.vy] = this.init(lerp(0, 3 * strength, Math.sqrt(Math.random())));
        [this.ax, this.ay] = this.init(lerp(0, 2 * strength, Math.random()));

        this.maxAliveT = lerp(0.2, 0.6, Math.random()) * Math.pow(strength, 0.4);
    }

    subRender(renderInfo: RenderInfo, fract: number) {
        const { ctx, scale } = renderInfo;

        const size = this.size * fract * (1 - fract);

        ctx.shadowColor = 'rgb(40,190,60)';
        ctx.strokeStyle = 'rgb(40,250,60)';
        ctx.shadowBlur = scale * 0.8;
        ctx.lineWidth = size;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(this.x - size, this.y);
        ctx.lineTo(this.x + size, this.y);
        ctx.moveTo(this.x, this.y - size);
        ctx.lineTo(this.x, this.y + size);
        ctx.stroke();
    }
}

export class ParticleSystem {
    particles: IParticle[] = [];

    render(renderInfo: RenderInfo) {
        for (let i = 0; i < this.particles.length;) {
            if (this.particles[i].render(renderInfo)) {
                this.particles[i] = this.particles[this.particles.length - 1];
                this.particles.pop();
            } else {
                i++;
            }
        }
    }

    addParticle(particle: IParticle) {
        this.particles.push(particle);
    }
}
