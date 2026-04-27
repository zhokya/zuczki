import type { Looks, Message, MessageBeetle } from "../../shared";
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
let looks = new Map<string, Looks>();
let beetles: MessageBeetle[] = [];
onMessage((data) => {
    const d: Message = JSON.parse(data);

    isAlive = false;
    d.beetles.forEach(b => {
        if(b.self) {
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

    beetles = d.beetles;

    if(d.looks !== undefined) {
        looks = new Map<string, Looks>();
        for(var k in d.looks) {
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

    let centerX = 0;
    let centerY = 0;
    let visibleArea = baseVisibleArea;
    beetles.forEach(b => {
        if(b.self) {
            centerX = b.x;
            centerY = b.y;
            visibleArea = Math.pow(b.size, visibleAreaExponent) * baseVisibleArea;
        }
    });
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

    beetles.forEach(b => {
        const look = looks.get(b.globId) as Looks;
        renderBeetle(
            prevT, t, ctx,
            b.x, b.y, b.angle, b.targetAngle, b.size, 
            look.mainColor, look.insideColor, look.antennaColor, look.antennaSize, look.antennaDots
        );
    });

    ctx.restore();

    prevT = t;
}
