import type { Looks, Message, MessageBeetle } from "../../shared";
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
let looks = new Map<string, Looks>();
let localBeetles = new Map<string, LocalBeetle>();

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
        looks = new Map<string, Looks>();
        for(const k in d.looks) {
            looks.set(k, d.looks[k]);
        }
    }
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

    localBeetles.forEach(b => {
        const look = looks.get(b.globId) as Looks;
        renderBeetle(
            prevT, t, ctx,
            b.x.value, b.y.value, b.angle.value, b.targetAngle.value, b.size.value, 
            look.mainColor, look.insideColor, look.antennaColor, look.antennaSize, look.antennaDots
        );
    });

    ctx.restore();

    prevT = t;
}
