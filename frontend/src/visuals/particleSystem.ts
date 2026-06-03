import type { particleEncoder } from "../../../shared/dataEncoders";
import { lerp, samplePointInCircle } from "../../../shared/utils";
import { quality } from "../menu/quality";
import type { RenderInfo } from "../renderInfo";

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
        if (fract >= 1) return true;

        ctx.globalAlpha = this.getOpacity(fract);
        this.subRender(renderInfo, fract);
        ctx.globalAlpha = 1;

        if(quality == 2) {
            ctx.shadowColor = 'rgba(0,0,0,0)';
            ctx.shadowBlur = 0;
        }

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

        if(quality == 2) {
            ctx.shadowColor = 'rgba(230,30,40,' + (1 - this.aliveT / 0.6) + ')';
            ctx.shadowBlur = scale * 0.6;
        }

        ctx.strokeStyle = 'rgba(255,110,80,' + (1 - this.aliveT / 0.6) + ')';
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

        if(quality == 2) {
            if (this.removal) {
                ctx.shadowColor = 'rgb(50,90,250)';
            } else {
                ctx.shadowColor = 'rgb(230,80,170)';
            }
            ctx.shadowBlur = scale * 0.6;
        }

        if (this.removal) {
            ctx.strokeStyle = 'rgb(140,170,250)';
        } else {
            ctx.strokeStyle = 'rgb(255,30,190)';
        }

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

export class DeathParticle extends ParticleBase {
    x; y; vx; vy; ax = 0; ay = 0; maxAliveT;
    hue; opacity; size;

    constructor(x: number, y: number) {
        super();

        this.x = x;
        this.y = y;

        [this.vx, this.vy] = this.init(lerp(0.2, 0.6, Math.random()));
        this.maxAliveT = lerp(0.6, 1.4, Math.random());

        this.hue = Math.floor(Math.random() * 360);
        this.opacity = lerp(0.3, 0.6, Math.random());
        this.size = lerp(0.3, 0.8, Math.random());
    }

    getOpacity(fract: number): number {
        return super.getOpacity(fract) * this.opacity;
    }

    subRender(): void {
        // const { ctx } = renderInfo;

        // ctx.fillStyle = 'hsl(' + this.hue + ',70%,60%)';
        // ctx.beginPath();
        // ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        // ctx.fill();
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

        if(quality == 2) {
            ctx.shadowColor = 'rgb(190,60,40)';
            ctx.shadowBlur = scale * 0.6;
        }

        ctx.strokeStyle = 'rgb(250,60,40)';
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
        this.size = lerp(0.6, 0.8, Math.random());

        [this.vx, this.vy] = this.init(lerp(0, 3 * strength, Math.sqrt(Math.random())));
        [this.ax, this.ay] = this.init(lerp(0, 2 * strength, Math.random()));

        this.maxAliveT = lerp(0.2, 0.6, Math.random()) * Math.pow(strength, 0.4);
    }

    subRender(renderInfo: RenderInfo, fract: number) {
        const { ctx, scale } = renderInfo;

        const size = this.size * fract * (1 - fract);

        if(quality == 2) {
            ctx.shadowColor = 'rgb(25, 102, 36)';
            ctx.strokeStyle = 'rgb(105, 252, 120)';
            ctx.shadowBlur = scale * 0.8;
        } else {
            ctx.strokeStyle = 'rgb(40,250,60)';
        }

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

    spawnMessageParticle(particle: typeof particleEncoder.type) {
        const qualityMult = quality == 0 ? 0.75 : 1;
        if(particle.type == 'death') {
            randomRepeat(() => {
                const [dx, dy] = samplePointInCircle(particle.size);
                this.addParticle(new DeathParticle(particle.x + dx, particle.y + dy));
            }, particle.size * 50 * qualityMult);
        } else if(particle.type == 'nonRuby') {
            randomRepeat(() => {
                if(particle.size < 0) {
                    this.addParticle(new SizeDecreaseParticle(particle.x, particle.y, 1 + Math.abs(particle.size * 8)));
                } else if(particle.size > 0) {
                    this.addParticle(new SizeIncreaseParticle(particle.x, particle.y, 1 + Math.abs(particle.size * 4)));
                }
            }, Math.abs(particle.size * 100 * qualityMult) + 4);
        } else {
            randomRepeat(() => {
                this.addParticle(new RubyParticle(particle.x, particle.y, 1 + Math.abs(particle.size * 4), particle.type == 'rubyRemoval'));
            }, Math.abs(particle.size * 100 * qualityMult) + 4);
        }
        randomRepeat(() => {
            if(particle.type == 'death') {

            } else if(particle.type == 'nonRuby') {
                if(particle.size < 0) {
                    this.addParticle(new SizeDecreaseParticle(particle.x, particle.y, 1 + Math.abs(particle.size * 8)));
                } else if(particle.size > 0) {
                    this.addParticle(new SizeIncreaseParticle(particle.x, particle.y, 1 + Math.abs(particle.size * 4)));
                }
            } else {
                this.addParticle(new RubyParticle(particle.x, particle.y, 1 + Math.abs(particle.size * 4), particle.type == 'rubyRemoval'));
            }
        }, Math.abs(particle.size * 100 * qualityMult) + 4);
    }
}
