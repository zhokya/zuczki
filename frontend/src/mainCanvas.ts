import type { Looks, Message, MessageBeetle } from "../../shared";
import renderBeetle from "./renderBeetle";
import { onMessage } from "./wsManager";

const c = document.getElementById('c') as HTMLCanvasElement;
const ctx = c.getContext('2d') as CanvasRenderingContext2D;

let prevW = -1;
let prevH = -1;
let prevT = -1;

let isAlive = false;
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

    beetles = d.beetles;

    looks = new Map<string, Looks>();
    if(d.looks !== undefined) {
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
    beetles.forEach(b => {
        if(b.self) {
            centerX = b.x;
            centerY = b.y;
        }
    });

    ctx.save();
    ctx.translate(w/2, h/2);
    ctx.scale(2, 2);
    ctx.translate(-centerX, -centerY);

    beetles.forEach(b => {
        const look = looks.get(b.globId) as Looks;
        renderBeetle(
            prevT, t, ctx,
            b.x, b.y, b.angle, b.targetAngle, b.size, 
            look.mainColor, look.insideColor, look.antennaColor, look.antennaSize, look.antennaDots
        );
    })

    ctx.restore();

    prevT = t;
}
