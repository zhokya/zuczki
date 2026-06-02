import { onMessage } from "./wsManager";
import { Beetle } from "./entities/beetle";
import { Point } from "./entities/point";
import { Ruby } from "./entities/ruby";
import { Obstacle } from "./entities/obstacle";
import { Projectile } from "./entities/projectile";
import { RenderInfo } from "./renderInfo";
import { updateFpsCounter } from "./visuals/fpsCounter";
import { getVisionBoundsFromCenter } from "../../shared/visionBounds";
import { looksEntryEncoder, type Looks } from "../../shared/looks";
import {
    beetleEncoder, headerEncoder, leaderboardEntryEncoder, obstacleEncoder, particleEncoder, pointCreationEncoder,
    pointRemovalEncoder, projectileEncoder, rubyEncoder
} from "../../shared/dataEncoders";
import { PointedDataView } from "../../shared/encoder/types";
import { formatPoints } from "../../shared/utils";
import { defaultAspect, getVisibleArea } from "../../shared/getVisibleArea";
import { ParticleSystem } from "./visuals/particleSystem";
import { Interpolator } from "./interpolator";
import { aliveT, onRenderIsAlive, updateIsAlive } from "./menu/menu";
import { render } from "./visuals/mainRenderer";
import { quality } from "./menu/quality";
import { SizeDelta } from "./visuals/sizeDelta";

const mainCanvas = document.getElementById('main-canvas') as HTMLCanvasElement;
const mainCanvasCtx = mainCanvas.getContext('2d') as CanvasRenderingContext2D;
const effectCanvas = document.createElement('canvas');
const effectCanvasCtx = effectCanvas.getContext('2d') as CanvasRenderingContext2D;

const leaderboardElement = document.getElementById('leaderboard') as HTMLElement;
const finalScoreElement = document.getElementById('final-score') as HTMLElement;

let prevW = -1;
let prevH = -1;
let prevT = -1;

let selfGlobId = -1;

const motionBlurAmount = new Interpolator(0, false);
const sizeDelta = new SizeDelta();
let cameraX = new Interpolator(0, false);
let cameraY = new Interpolator(0, false);
export const mapSize = new Interpolator(parseInt(import.meta.env.VITE_MAP_SIZE), false);

let looksMap = new Map<number, Looks>();
let beetles = new Map<number, Beetle>();
let rubys = new Map<number, Ruby>();
let obstacles = new Map<number, Obstacle>();
let projectiles = new Map<number, Projectile>();
let points = new Map<number, Point>();
const particleSystem = new ParticleSystem();

function updateLocalEntitiesMap<T1 extends { update: (entity: T2) => void }, T2 extends { id: number }>(
    localMap: Map<number, T1>,
    msgEntities: T2[],
    ctor: new (entity: T2) => T1
) {
    const updatedIds = new Set();
    msgEntities.forEach(entity => {
        if (!localMap.has(entity.id)) {
            localMap.set(entity.id, new ctor(entity));
        }
        localMap.get(entity.id)?.update(entity);
        updatedIds.add(entity.id);
    });

    for (const id of localMap.keys()) {
        if (!updatedIds.has(id)) {
            const element = localMap.get(id) as T1;
            if (element instanceof Ruby || element instanceof Projectile) {
                element.removed = true;
            } else {
                localMap.delete(id);
            }
        }
    }
}

onMessage((data: ArrayBuffer, isFirstMessage: boolean) => {
    const view = new PointedDataView(new DataView(data));

    const header = headerEncoder.readFromBuffer(view);
    selfGlobId = header.globId;
    motionBlurAmount.update(header.motionBlur);
    sizeDelta.update(header.vsize);
    mapSize.update(header.mapSize);

    if (isFirstMessage) {
        looksMap = new Map<number, Looks>();
        beetles = new Map<number, Beetle>();
        rubys = new Map<number, Ruby>();
        obstacles = new Map<number, Obstacle>();
        points = new Map<number, Point>();
        cameraX = new Interpolator(header.cameraX, false);
        cameraY = new Interpolator(header.cameraY, false);
    } else {
        cameraX.update(header.cameraX);
        cameraY.update(header.cameraY);
    }

    const msgBeetles = beetleEncoder.readListFromBuffer(view, header.numBeetles);
    updateLocalEntitiesMap(beetles, msgBeetles, Beetle);
    updateLocalEntitiesMap(rubys, rubyEncoder.readListFromBuffer(view, header.numRubys), Ruby);
    updateLocalEntitiesMap(obstacles, obstacleEncoder.readListFromBuffer(view, header.numObstacles), Obstacle);
    updateLocalEntitiesMap(projectiles, projectileEncoder.readListFromBuffer(view, header.numProjectiles), Projectile);

    particleEncoder.readListFromBuffer(view, header.numParticles).forEach(particle => particleSystem.spawnMessageParticle(particle));

    pointCreationEncoder.readListFromBuffer(view, header.numPointCreations).forEach(pointCreation => {
        points.set(pointCreation.id, new Point(pointCreation));
    });

    pointRemovalEncoder.readListFromBuffer(view, header.numPointRemovals).forEach(pointRemoval => {
        const point = points.get(pointRemoval.id);
        if (point !== undefined) {
            point.remove(pointRemoval);
        }
    });

    looksEntryEncoder.readListFromBuffer(view, header.numLooks).forEach(lookEntry => {
        looksMap.set(lookEntry.globId, lookEntry.looks);
    });

    const leaderboardData = leaderboardEntryEncoder.readListFromBuffer(view, header.numLeaderboardEntries);
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

    let isAlive = false;
    msgBeetles.forEach(b => {
        if (b.id === selfGlobId) {
            isAlive = true;
        }
    });
    updateIsAlive(isAlive, header.canJoin);
});

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

    onRenderIsAlive(prevT, t);

    for (const b of beetles.values()) {
        b.onRender();
    }
    [points, rubys, projectiles].forEach(entityMap => {
        entityMap.forEach(entity => {
            if (entity.canRemove()) {
                entityMap.delete(entity.id);
            }
        });
    });

    motionBlurAmount.onRender();
    const motionBlurOpacity = 1 - motionBlurAmount.value / 255 * 0.9;
    const renderMotionBlurEffect = motionBlurOpacity < 0.99 && quality > 0;

    mapSize.onRender();

    cameraX.onRender();
    cameraY.onRender();
    let centerX = cameraX.value;
    let centerY = cameraY.value;
    let visibleArea = getVisibleArea(null);
    const selfBeetle = beetles.get(selfGlobId);
    if (selfBeetle !== undefined) {
        centerX = selfBeetle.x.value;
        centerY = selfBeetle.y.value;
        visibleArea = getVisibleArea(selfBeetle.size.value);
        if (aliveT > 1000) {
            finalScoreElement.innerText = selfBeetle.score + ' ' + formatPoints(selfBeetle.score);
        }
    }
    const scale = Math.max(h / visibleArea, w / defaultAspect / visibleArea);

    const bounds = getVisionBoundsFromCenter(centerX, centerY, w, h, scale);
    const renderInfo = new RenderInfo(
        renderMotionBlurEffect ? effectCanvasCtx : mainCanvasCtx,
        prevT, t, w, h, scale, centerX, centerY, bounds, particleSystem
    );

    render(renderInfo, selfBeetle, sizeDelta, looksMap, beetles, rubys, obstacles, projectiles, points);

    if (renderMotionBlurEffect) {
        mainCanvasCtx.globalAlpha = motionBlurOpacity;
        mainCanvasCtx.drawImage(effectCanvas, 0, 0);
        mainCanvasCtx.globalAlpha = 1;
    }

    updateFpsCounter(frameStartTime);
    prevT = t;
}
