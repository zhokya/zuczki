import { onMessage } from "./wsManager";
import { LocalBeetle } from "./entities/beetle";
import { LocalPoint } from "./entities/point";
import { LocalRuby } from "./entities/ruby";
import { aliveT, onDead } from "./menu";
import { renderSizeWarning } from "./visuals/sizeWarning";
import { renderMinimap } from "./visuals/minimap";
import type { RenderInfo } from "./types";
import { renderBeforeTransform, renderEnvironment, renderWorldEdge } from "./visuals/environment";
import { registerWebsocketDataReceived, updateFpsCounter } from "./visuals/fpsCounter";
import { LocalObstacle } from "./entities/obstacle";
import { getVisionBoundsFromCenter } from "../../shared/visionBounds";
import { looksEntryEncoder, type Looks } from "../../shared/looks";
import { beetleEncoder, headerEncoder, leaderboardEntryEncoder, obstacleEncoder, particleEncoder, pointCreationEncoder, pointRemovalEncoder, rubyEncoder } from "../../shared/dataEncoders";
import { PointedDataView } from "../../shared/encoder/types";
import { formatPoints, samplePointInCircle } from "../../shared/utils";
import { defaultAspect, getVisibleArea } from "../../shared/getVisibleArea";
import { DeathParticle, ParticleSystem, randomRepeat, RubyParticle, SizeDecreaseParticle, SizeIncreaseParticle } from "./visuals/particleSystem";
import { Interpolator } from "./interpolator";

const mainCanvas = document.getElementById('main-canvas') as HTMLCanvasElement;
const mainCanvasCtx = mainCanvas.getContext('2d') as CanvasRenderingContext2D;
const effectCanvas = document.createElement('canvas');
const effectCanvasCtx = effectCanvas.getContext('2d') as CanvasRenderingContext2D;

const menu = document.getElementById('menu') as HTMLDivElement;
const leaderboardElement = document.getElementById('leaderboard') as HTMLElement;
const finalScoreElement = document.getElementById('final-score') as HTMLElement;
const gameInfoElement = document.getElementById('game-info') as HTMLElement;

let prevW = -1;
let prevH = -1;
let prevT = -1;

export let isAlive = false;
let prevDelayedIsAlive = false;
let unaliveStartT: number | null = -1e9;
let selfGlobId = -1;
const motionBlurAmount = new Interpolator(0, false);
let cameraX = new Interpolator(0, false);
let cameraY = new Interpolator(0, false);

let looksMap = new Map<number, Looks>();
let localBeetles = new Map<number, LocalBeetle>();
let localRubys = new Map<number, LocalRuby>();
let localObstacles = new Map<number, LocalObstacle>();
let localPoints = new Map<number, LocalPoint>();
const particleSystem = new ParticleSystem();

onMessage((data: ArrayBuffer, isFirstMessage: boolean) => {
    registerWebsocketDataReceived(data.byteLength);

    const view = new PointedDataView(new DataView(data));
    const header = headerEncoder.readFromBuffer(view);

    const beetles = beetleEncoder.readListFromBuffer(view, header.numBeetles);
    const rubys = rubyEncoder.readListFromBuffer(view, header.numRubys);
    const obstacles = obstacleEncoder.readListFromBuffer(view, header.numObstacles);
    const particles = particleEncoder.readListFromBuffer(view, header.numParticles);
    const pointCreations = pointCreationEncoder.readListFromBuffer(view, header.numPointCreations);
    const pointRemovals = pointRemovalEncoder.readListFromBuffer(view, header.numPointRemovals);
    const lookUpdates = looksEntryEncoder.readListFromBuffer(view, header.numLooks);
    const leaderboardData = leaderboardEntryEncoder.readListFromBuffer(view, header.numLeaderboardEntries);

    selfGlobId = header.globId;
    motionBlurAmount.update(header.motionBlur);

    isAlive = false;
    beetles.forEach(b => {
        if (b.globId === selfGlobId) {
            isAlive = true;
        }
    });

    if(isAlive) {
        unaliveStartT = null;
    } else if(unaliveStartT === null) {
        unaliveStartT = performance.now();
    }
    const delayedIsAlive = unaliveStartT === null || performance.now() - unaliveStartT < 3000;
    if (delayedIsAlive !== prevDelayedIsAlive) {
        if (isAlive) {
            mainCanvas.style = 'filter: none; opacity: 1;';
            menu.style = 'opacity: 0; pointer-events: none;'
            gameInfoElement.style = 'opacity: 1;';
        } else {
            mainCanvas.style = 'filter: blur(10px); opacity: 0.5;';
            menu.style = 'opacity: 1; pointer-events: all;';
            gameInfoElement.style = 'opacity: 0;';
            onDead();
        }
    }
    prevDelayedIsAlive = delayedIsAlive;

    if(isFirstMessage) {
        looksMap = new Map<number, Looks>();
        localBeetles = new Map<number, LocalBeetle>();
        localRubys = new Map<number, LocalRuby>();
        localObstacles = new Map<number, LocalObstacle>();
        localPoints = new Map<number, LocalPoint>();
        cameraX = new Interpolator(header.cameraX, false);
        cameraY = new Interpolator(header.cameraY, false);
    } else {
        cameraX.update(header.cameraX);
        cameraY.update(header.cameraY);
    }

    const updatedIds = new Set();
    beetles.forEach(b => {
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
    rubys.forEach(r => {
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

    const updatedObstacleIds = new Set();
    obstacles.forEach(o => {
        if (!localObstacles.has(o.id)) {
            localObstacles.set(o.id, new LocalObstacle(o));
        }
        localObstacles.get(o.id)?.update(o);
        updatedObstacleIds.add(o.id);
    });
    for (const obstacleId of localObstacles.keys()) {
        if (!updatedObstacleIds.has(obstacleId)) {
            localObstacles.delete(obstacleId);
        }
    }

    particles.forEach(p => {
        if(p.type == 'death') {
            randomRepeat(() => {
                const [dx, dy] = samplePointInCircle(p.size);
                particleSystem.addParticle(new DeathParticle(p.x + dx, p.y + dy));
            }, p.size * 50);
        } else if(p.type == 'nonRuby') {
            randomRepeat(() => {
                if(p.size < 0) {
                    particleSystem.addParticle(new SizeDecreaseParticle(p.x, p.y, 1 + Math.abs(p.size * 8)));
                } else if(p.size > 0) {
                    particleSystem.addParticle(new SizeIncreaseParticle(p.x, p.y, 1 + Math.abs(p.size * 4)));
                }
            }, Math.abs(p.size * 100) + 4);
        } else {
            randomRepeat(() => {
                particleSystem.addParticle(new RubyParticle(p.x, p.y, 1 + Math.abs(p.size * 4), p.type == 'rubyRemoval'));
            }, Math.abs(p.size * 100) + 4);
        }
        randomRepeat(() => {
            if(p.type == 'death') {

            } else if(p.type == 'nonRuby') {
                if(p.size < 0) {
                    particleSystem.addParticle(new SizeDecreaseParticle(p.x, p.y, 1 + Math.abs(p.size * 8)));
                } else if(p.size > 0) {
                    particleSystem.addParticle(new SizeIncreaseParticle(p.x, p.y, 1 + Math.abs(p.size * 4)));
                }
            } else {
                particleSystem.addParticle(new RubyParticle(p.x, p.y, 1 + Math.abs(p.size * 4), p.type == 'rubyRemoval'));
            }
        }, Math.abs(p.size * 100) + 4);
    });

    lookUpdates.forEach(lookEntry => {
        looksMap.set(lookEntry.globId, lookEntry.looks);
    });

    pointCreations.forEach(point => {
        localPoints.set(point.id, new LocalPoint(point));
    });

    pointRemovals.forEach(removal => {
        const point = localPoints.get(removal.id);
        if (point !== undefined) {
            point.remove(removal);
        }
    });

    if (leaderboardData.length != 0) {
        const newChildren: HTMLSpanElement[] = [];
        leaderboardData.forEach((elem) => {
            const spanElem = document.createElement('span');
            const looks = looksMap.get(elem.globId);
            spanElem.innerText = `${elem.place}. ${looks ? looks.nickname : '???'} (${elem.score})`;
            if (elem.globId == selfGlobId) {
                spanElem.className = 'leaderboard-self';
            }
            newChildren.push(spanElem);
        })
        leaderboardElement.replaceChildren(...newChildren);
    }
});

interface Text {
    x: number;
    y: number;
    text: string;
}

function renderWorld(renderInfo: RenderInfo): Text[] {
    const { ctx } = renderInfo;
    
    renderEnvironment(renderInfo);

    // ctx.fillStyle = 'rgba(0,0,0,.5)';
    // const vx = visibleArea * defaultAspect;
    // const vy = visibleArea;
    // ctx.fillRect(centerX - vx / 2, centerY - vy / 2, vx, vy);
    // ctx.fillStyle = 'rgba(0,0,255,.2)';
    // ctx.fillRect(centerX - vx * 0.45, centerY - vy * 0.45, vx * 0.9, vy * 0.9);
    // ctx.fillStyle = 'rgba(0,255,0,.2)';
    // ctx.fillRect(centerX - vx / 4, centerY - vy / 4, vx / 2, vy / 2);

    const texts: Text[] = [];
    const matrix = ctx.getTransform();

    localPoints.forEach(p => {
        p.render(renderInfo);
        if (p.removedTime > 1000) {
            localPoints.delete(p.id);
        }
    });

    localRubys.forEach(r => {
        r.render(renderInfo);
        if (r.removed && r.visibleHp < 0.01) {
            localRubys.delete(r.id);
        }
    });

    localObstacles.forEach(o => {
        o.render(renderInfo);
    });

    renderWorldEdge(renderInfo);

    localBeetles.forEach(b => {
        const look = looksMap.get(b.globId);

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

    particleSystem.render(renderInfo);

    return texts;
}

function render(renderInfo: RenderInfo, selfBeetle: LocalBeetle | undefined) {
    const { ctx, scale, w, h, centerX, centerY } = renderInfo;

    renderBeforeTransform(renderInfo);

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(scale, scale);
    ctx.translate(-centerX, -centerY);

    const texts = renderWorld(renderInfo);

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
        if (aliveT > 1000) {
            finalScoreElement.innerText = selfBeetle.score + ' ' + formatPoints(selfBeetle.score);
        }
    }
}

export function mainCanvasRenderLoop(t: number) {
    const frameStartTime = performance.now();

    requestAnimationFrame(mainCanvasRenderLoop);

    const w = window.innerWidth * window.devicePixelRatio;
    const h = window.innerHeight * window.devicePixelRatio;
    if (prevW != w || prevH != h) {
        mainCanvas.width = w;
        mainCanvas.height = h;
        effectCanvas.width = w;
        effectCanvas.height = h;
        prevW = w;
        prevH = h;
    }

    if (prevT === -1) {
        prevT = t;
    }

    for (const b of localBeetles.values()) {
        b.onRender();
    }

    motionBlurAmount.onRender();
    const motionBlurOpacity = 1 - motionBlurAmount.value / 255 * 0.9;
    const renderMotionBlurEffect = motionBlurOpacity < 0.99;

    cameraX.onRender();
    cameraY.onRender();
    let centerX = cameraX.value;
    let centerY = cameraY.value;
    let visibleArea = getVisibleArea(null);
    const selfBeetle = localBeetles.get(selfGlobId);
    if (selfBeetle !== undefined) {
        centerX = selfBeetle.x.value;
        centerY = selfBeetle.y.value;
        visibleArea = getVisibleArea(selfBeetle.size.value);
    }
    const scale = Math.max(h / visibleArea, w / defaultAspect / visibleArea);

    const bounds = getVisionBoundsFromCenter(centerX, centerY, w, h, scale);
    const renderInfo: RenderInfo = {
        ctx: renderMotionBlurEffect ? effectCanvasCtx : mainCanvasCtx,
        w, h, t, prevT, scale, bounds, particleSystem, centerX, centerY 
    };

    render(renderInfo, selfBeetle);

    if(renderMotionBlurEffect) {
        mainCanvasCtx.globalAlpha = motionBlurOpacity;
        mainCanvasCtx.drawImage(effectCanvas, 0, 0);
        mainCanvasCtx.globalAlpha = 1;
    }

    updateFpsCounter(frameStartTime);
    prevT = t;
}
