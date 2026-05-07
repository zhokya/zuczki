import { type Looks, type Message } from "../../shared";
import { onMessage } from "./wsManager";
import { LocalBeetle } from "./entities/beetle";
import { LocalPoint } from "./entities/point";
import { LocalRuby } from "./entities/ruby";
import { onDead } from "./menu";
import { renderSizeWarning } from "./visuals/sizeWarning";
import { renderMinimap } from "./visuals/minimap";
import type { RenderInfo } from "./types";
import { renderEnvironment } from "./visuals/environment";
import { updateFpsCounter } from "./visuals/fpsCounter";

const baseVisibleArea = 25;
const visibleAreaExponent = 0.4;

const c = document.getElementById('c') as HTMLCanvasElement;
const ctx = c.getContext('2d') as CanvasRenderingContext2D;
const menu = document.getElementById('menu') as HTMLDivElement;

let prevW = -1;
let prevH = -1;
let prevT = -1;

export let isAlive = false;
let prevIsAlive = false;
let selfGlobId = '';

let looks = new Map<string, Looks>();
let localBeetles = new Map<string, LocalBeetle>();
let localRubys = new Map<number, LocalRuby>();
let points = new Map<number, LocalPoint>();

onMessage((data) => {
    const d: Message = JSON.parse(data);

    selfGlobId = d.globId;

    isAlive = false;
    d.beetles.forEach(b => {
        if (b.globId === selfGlobId) {
            isAlive = true;
        }
    });

    if (isAlive !== prevIsAlive) {
        if (isAlive) {
            c.style = 'filter: none; opacity: 1;';
            menu.style = 'opacity: 0; pointer-events: none;'
        } else {
            c.style = 'filter: blur(10px); opacity: 0.5;';
            menu.style = 'opacity: 1; pointer-events: all;';
            onDead();
        }
    }
    prevIsAlive = isAlive;

    const updatedIds = new Set();
    d.beetles.forEach(b => {
        if (!localBeetles.has(b.globId)) {
            localBeetles.set(b.globId, new LocalBeetle(b));
        }
        localBeetles.get(b.globId)?.update(b);
        updatedIds.add(b.globId);
    });
    for (const globId of localBeetles.keys()) {
        if (!updatedIds.has(globId)) {
            localBeetles.delete(globId);
        }
    }

    const updatedRubyIds = new Set();
    d.rubys.forEach(r => {
        if (!localRubys.has(r.id)) {
            localRubys.set(r.id, new LocalRuby(r));
        }
        localRubys.get(r.id)?.update(r);
        updatedRubyIds.add(r.id);
    });
    for (const rubyId of localRubys.keys()) {
        if (!updatedRubyIds.has(rubyId)) {
            (localRubys.get(rubyId) as LocalRuby).removed = true;
        }
    }

    if (d.looks !== undefined) {
        for (const k in d.looks) {
            looks.set(k, d.looks[k]);
        }
    }

    d.newPoints.forEach(el => {
        points.set(el[0], new LocalPoint(el));
    });

    d.removedPoints.forEach(el => {
        const point = points.get(el[0]);
        if (point !== undefined) {
            point.remove(el);
        }
    });
});

export function mainCanvasRenderLoop(t: number) {
    const frameStartTime = performance.now();

    requestAnimationFrame(mainCanvasRenderLoop);

    const w = window.innerWidth * window.devicePixelRatio;
    const h = window.innerHeight * window.devicePixelRatio;
    if (prevW != w || prevH != h) {
        c.width = w;
        c.height = h;
        prevW = w;
        prevH = h;
    }

    if (prevT === -1) {
        prevT = t;
    }

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, w, h);

    for (const b of localBeetles.values()) {
        b.onRender();
    }

    let centerX = 0;
    let centerY = 0;
    let visibleArea = 2 * baseVisibleArea;
    const selfBeetle = localBeetles.get(selfGlobId);
    if (selfBeetle !== undefined) {
        centerX = selfBeetle.x.value;
        centerY = selfBeetle.y.value;
        visibleArea = Math.pow(selfBeetle.size.value, visibleAreaExponent) * baseVisibleArea;
    }
    const scale = (window.innerWidth + window.innerHeight) / 2 / visibleArea;

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(scale, scale);
    ctx.translate(-centerX, -centerY);

    const texts: { x: number, y: number, text: string }[] = [];
    const matrix = ctx.getTransform();
    const renderInfo: RenderInfo = { w, h, ctx, t, prevT, scale };
    
    renderEnvironment(renderInfo);

    points.forEach(p => {
        p.render(renderInfo);
        if (p.removedTime > 1000) {
            points.delete(p.id);
        }
    });

    localRubys.forEach(r => {
        r.render(renderInfo);
        if (r.removed && r.visibleHp < 0.01) {
            localRubys.delete(r.id);
        }
    });

    localBeetles.forEach(b => {
        let look = looks.get(b.globId);

        b.render(renderInfo, look);

        texts.push({
            x: Math.round(matrix.a * b.x.value + matrix.c * (b.y.value + b.size.value * 1.2) + matrix.e),
            y: Math.round(matrix.b * b.x.value + matrix.d * (b.y.value + b.size.value * 1.2) + matrix.f),
            text: (look === undefined || look.nickname === '' ? '' : look.nickname + ' ') + '(' + b.score + ')'
        });
    });

    localRubys.forEach(r => {
        r.renderHpBar(renderInfo);
    });

    ctx.restore();

    ctx.fillStyle = 'black';
    ctx.font = '14px arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    texts.forEach(t => {
        ctx.fillText(t.text, t.x, t.y);
    });

    if (selfBeetle !== undefined) {
        renderMinimap(renderInfo, selfBeetle);
        renderSizeWarning(renderInfo, selfBeetle.size.value);
    }

    updateFpsCounter(frameStartTime);
    prevT = t;
}
