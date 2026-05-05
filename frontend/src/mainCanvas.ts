import { expLerp, lerp, type Looks, type Message, type MessageBeetle } from "../../shared";
import { Interpolator } from "./interpolator";
import renderBeetle from "./renderBeetle";
import { onMessage } from "./wsManager";

const baseVisibleArea = 20;
const visibleAreaExponent = 0.4;

const c = document.getElementById('c') as HTMLCanvasElement;
const ctx = c.getContext('2d') as CanvasRenderingContext2D;
const menu = document.getElementById('menu') as HTMLDivElement;

let prevW = -1;
let prevH = -1;
let prevT = -1;

export let isAlive = false;
let prevIsAlive: boolean | null = null;
let selfGlobId = '';

let prevSelfScore = 0;
let scoreUpdateValue = 0;
let scoreUpdateOpacity = 0;
let scoreUpdateY = 0;
let scoreUpdateUpdates = 0;

class LocalBeetle {
    x: Interpolator;
    y: Interpolator;
    size: Interpolator;
    angle: Interpolator;
    targetAngle: Interpolator;

    score: number = 0;
    globId: string = '';

    constructor(b: MessageBeetle) {
        this.x = new Interpolator(b.x, false);
        this.y = new Interpolator(b.y, false);
        this.size = new Interpolator(b.size, false);
        this.angle = new Interpolator(b.angle, true);
        this.targetAngle = new Interpolator(b.targetAngle, true);
    }

    update(b: MessageBeetle) {
        this.x.update(b.x);
        this.y.update(b.y);
        this.size.update(b.size);
        this.angle.update(b.angle);
        this.targetAngle.update(b.targetAngle);
        
        this.score = b.score;
        this.globId = b.globId;
    }

    onRender() {
        this.x.onRender();
        this.y.onRender();
        this.size.onRender();
        this.angle.onRender();
        this.targetAngle.onRender();
    }
}
class LocalPoint {
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
    
    render(prevTimestep: number, timestep: number, ctx: CanvasRenderingContext2D): boolean {
        const dt = timestep - prevTimestep;

        this.x = expLerp(this.x, this.tx, dt, 0.005);
        this.y = expLerp(this.y, this.ty, dt, 0.005);
        this.o = expLerp(this.o, this.to, dt, 0.02);

        ctx.fillStyle = 'rgba(192, 64, 0, ' + this.o + ')';
        ctx.fillRect(this.x - 0.1, this.y - 0.1, 0.2, 0.2);

        if(this.removed) {
            this.removedTime += dt;
        }
        return this.removedTime > 2000;
    }
}
let looks = new Map<string, Looks>();
let localBeetles = new Map<string, LocalBeetle>();
let points = new Map<number, LocalPoint>();

onMessage((data) => {
    const d: Message = JSON.parse(data);

    selfGlobId = d.globId;

    isAlive = false;
    d.beetles.forEach(b => {
        if(b.globId === selfGlobId) {
            isAlive = true;
        }
    });

    if(isAlive !== prevIsAlive) {
        if(isAlive) {
            c.style = 'filter: none; opacity: 1;';
            menu.style = 'opacity: 0; pointer-events: none;'
        } else {
            c.style = 'filter: blur(10px); opacity: 0.5;';
            menu.style = 'opacity: 1; pointer-events: all;';
        }
    }

    const updatedIds = new Set();
    d.beetles.forEach(b => {
        if(!localBeetles.has(b.globId)) {
            localBeetles.set(b.globId, new LocalBeetle(b));
        }
        localBeetles.get(b.globId)?.update(b);
        updatedIds.add(b.globId);
    });
    for(const globId of localBeetles.keys()) {
        if(!updatedIds.has(globId)) {
            localBeetles.delete(globId);
        }
    }

    if(d.looks !== undefined) {
        for(const k in d.looks) {
            looks.set(k, d.looks[k]);
        }
    }

    d.newPoints.forEach(el => {
        points.set(el[0], new LocalPoint(el));
    });

    d.removedPoints.forEach(el => {
        const point = points.get(el[0]);
        if(point !== undefined) {
            point.remove(el);
        }
    });
});

export function mainCanvasRenderLoop(t: number) {
    requestAnimationFrame(mainCanvasRenderLoop);

    const w = window.innerWidth * window.devicePixelRatio;
    const h = window.innerHeight * window.devicePixelRatio;
    if(prevW != w || prevH != h) {
        c.width = w;
        c.height = h;
        prevW = w;
        prevH = h;
    }

    if(prevT === -1) {
        prevT = t;
    }
    
    ctx.clearRect(0, 0, w, h);
    
    for(const b of localBeetles.values()) {
        b.onRender();
    }

    let centerX = 0;
    let centerY = 0;
    let visibleArea = baseVisibleArea;
    const selfBeetle = localBeetles.get(selfGlobId);
    if(selfBeetle !== undefined) {
        centerX = selfBeetle.x.value;
        centerY = selfBeetle.y.value;
        visibleArea = Math.pow(selfBeetle.size.value, visibleAreaExponent) * baseVisibleArea;
    }
    const scale = (window.innerWidth + window.innerHeight) / 2 / visibleArea;

    ctx.save();
    ctx.translate(w/2, h/2);
    ctx.scale(scale, scale);
    ctx.translate(-centerX, -centerY);

    ctx.strokeStyle = 'red';
    ctx.lineWidth = 0.1;
    ctx.beginPath();
    ctx.arc(0, 0, parseInt(import.meta.env.VITE_MAP_SIZE), 0, Math.PI * 2);
    ctx.stroke();

    const texts: {x: number, y: number, text: string}[] = [];
    const matrix = ctx.getTransform();

    points.forEach(p => {
        if(p.render(prevT, t, ctx)) {
            points.delete(p.id);
        }
    });

    localBeetles.forEach(b => {
        let look = looks.get(b.globId);

        if(look === undefined) {
            // server skill issue, this should never happen
            look = {
                mainColor: t % 1000 > 500 ? 'black' : 'cyan',
                insideColor: 'white',
                antennaColor: 'black',
                antennaDots: false,
                antennaSize: 0,
                nickname: ''
            };
        }

        renderBeetle(
            prevT, t, ctx,
            b.x.value, b.y.value, b.angle.value, b.targetAngle.value, b.size.value, 
            look.mainColor, look.insideColor, look.antennaColor, look.antennaSize, look.antennaDots
        );
        texts.push({
            x: Math.round(matrix.a * b.x.value + matrix.c * (b.y.value + b.size.value * 1.2) + matrix.e),
            y: Math.round(matrix.b * b.x.value + matrix.d * (b.y.value + b.size.value * 1.2) + matrix.f),
            text: look.nickname + ' (' + b.score + ')'
        });
    });

    ctx.restore();

    ctx.fillStyle = 'black';
    ctx.font = '14px arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    texts.forEach(t => {
        ctx.fillText(t.text, t.x, t.y);
    });
    
    if(selfBeetle !== undefined) {
        if(selfBeetle.score != prevSelfScore) {
            if(scoreUpdateOpacity < 0) {
                scoreUpdateY = -16;
                scoreUpdateValue = 0;
                scoreUpdateUpdates = 0;
            }
            scoreUpdateOpacity = 1;
            scoreUpdateValue += selfBeetle.score - prevSelfScore;
            scoreUpdateUpdates ++;
            prevSelfScore = selfBeetle.score;
        }
        scoreUpdateY = lerp(scoreUpdateY, 16, 0.2);
        scoreUpdateOpacity = scoreUpdateOpacity * 0.99 - 0.002;
        // if(scoreUpdateOpacity > 0) {
        //     ctx.fillStyle = 'rgba(45,234,78,' + scoreUpdateOpacity + ')';
        //     ctx.font = (scoreUpdateUpdates * 4 + 14) + 'px arial';
        //     ctx.fillText(
        //         '+' + scoreUpdateValue, 
        //         Math.round(matrix.a * selfBeetle.x.value + matrix.c * (selfBeetle.y.value - selfBeetle.size.value * 1.2) + matrix.e), 
        //         Math.round(matrix.b * selfBeetle.x.value + matrix.d * (selfBeetle.y.value - selfBeetle.size.value * 1.2) + matrix.f) - scoreUpdateY
        //     );
        // }
    }

    prevT = t;
}
