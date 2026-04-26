import { angleDifference } from "../../shared";

const motionBlurSteps = 10;

const minWingOffset = 0.02;
const maxWingOffset = 0.4;
const wingSpeed = 5;
const wingCenterDistance = 0.1;

const minInsideRadius = 0.78;
const maxInsideRadius = 0.85;
const insideBreathingSpeed = 0.25;

const eyeFromCenterDistance = 0.85;
const eyeSeparationAngle = 1.2;
const eyeSize = 0.22;
const eyeBorderSize = 0.035;
const pupilFromEyeDistance = 0.07;
const pupilSize = 0.11;

const antennaSeparation = 0.18;
const antennaDotsSize = 0.12;

function getBeetleWingOffset(timestep: number) {
    let t = Math.sin(timestep * wingSpeed / 1000 * Math.PI * 2);
    t = (t + 1) / 2;
    return t * maxWingOffset + (1 - t) * minWingOffset;
}
function getBeetleWingPeriod(timestep: number) {
    return Math.round(2 * timestep * wingSpeed / 1000);
}
function insideSize(timestep: number) {
    let t = Math.sin(timestep * insideBreathingSpeed / 1000 * Math.PI * 2);
    t = Math.sin(t * Math.PI / 2);
    t = (t + 1) / 2;
    const area = t * maxInsideRadius * maxInsideRadius + (1 - t) * minInsideRadius * minInsideRadius;
    return Math.sqrt(area);
}

export default function renderBeetle(
    prevTimestep: number, timestep: number,
    ctx: CanvasRenderingContext2D,
    x: number, y: number, angle: number, targetAngle: number, size: number,
    mainColor: string, insideColor: string, antennaColor: string, antennaSize: number, antennaDots: boolean
) {
    if (antennaSize > 0) {
        ctx.save();

        ctx.translate(x, y);
        ctx.rotate(angle);
        let path = new Path2D();
        let ax = size;
        let ay = -size * antennaSeparation;
        let bx = ax + size * antennaSize * 1.2;
        let by = ay - size * antennaSize * 0.1;
        let cx = ax + size * antennaSize * 1.5;
        let cy = ay - size * antennaSize * 0.8;
        path.moveTo(ax, ay);
        path.quadraticCurveTo(bx, by, cx, cy);
        path.moveTo(ax, -ay);
        path.quadraticCurveTo(bx, -by, cx, -cy);
        ctx.strokeStyle = antennaColor;
        ctx.lineCap = 'round';
        ctx.lineWidth = size / 10;
        ctx.stroke(path);

        if (antennaDots) {
            path = new Path2D();
            path.moveTo(cx, cy);
            path.arc(cx, cy, size * antennaDotsSize, 0, 2 * Math.PI);
            path.moveTo(cx, -cy);
            path.arc(cx, -cy, size * antennaDotsSize, 0, 2 * Math.PI);
            ctx.fillStyle = antennaColor;
            ctx.fill(path);
        }

        ctx.restore();
    }

    // inside body
    ctx.fillStyle = insideColor;
    ctx.beginPath();
    ctx.arc(x, y, size * insideSize(timestep), 0, Math.PI * 2);
    ctx.fill();

    // main body
    let offsetFrom = getBeetleWingOffset(prevTimestep);
    let offsetTo = getBeetleWingOffset(timestep);
    if(offsetTo > offsetFrom) {
        [offsetFrom, offsetTo] = [offsetTo, offsetFrom];
    }
    if(getBeetleWingPeriod(prevTimestep) !== getBeetleWingPeriod(timestep)) {
        // Either maxWingOffset or minWingOffset
        // Fix animation by putting offset range to max range
        if(offsetTo > (maxWingOffset + minWingOffset) / 2) {
            offsetFrom = maxWingOffset;
        } else {
            offsetTo = minWingOffset;
        }
    }

    const cpx = x - Math.cos(angle) * size * wingCenterDistance;
    const cpy = y - Math.sin(angle) * size * wingCenterDistance;

    ctx.fillStyle = mainColor;
    ctx.beginPath();
    ctx.moveTo(cpx, cpy);
    ctx.arc(x, y, size, angle - Math.PI + Math.max(offsetFrom, offsetTo), angle + Math.PI - Math.max(offsetFrom, offsetTo));
    ctx.lineTo(cpx, cpy);
    ctx.fill();
    
    // main body motion blur
    for (let i = 1; i <= motionBlurSteps; i++) {
        ctx.globalAlpha = 1 / (i + 1);
        let o = offsetFrom + (offsetTo - offsetFrom) * (i / motionBlurSteps);

        ctx.beginPath();
        ctx.moveTo(cpx, cpy);
        ctx.arc(x, y, size, angle - Math.PI + o, angle - Math.PI + offsetFrom);
        ctx.lineTo(cpx, cpy);
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(cpx, cpy);
        ctx.arc(x, y, size, angle + Math.PI - offsetFrom, angle + Math.PI - o);
        ctx.lineTo(cpx, cpy);
        ctx.fill();
    }
    ctx.globalAlpha = 1;

    // eyes
    let npx =  x + Math.cos(angle - eyeSeparationAngle / 2) * size * eyeFromCenterDistance;
    let npy =  y + Math.sin(angle - eyeSeparationAngle / 2) * size * eyeFromCenterDistance;
    let npxt = x + Math.cos(angle + eyeSeparationAngle / 2) * size * eyeFromCenterDistance;
    let npyt = y + Math.sin(angle + eyeSeparationAngle / 2) * size * eyeFromCenterDistance;

    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = size * eyeBorderSize;
    let path = new Path2D();
    path.arc(npx, npy, size * eyeSize, 0, 2 * Math.PI);
    path.moveTo(npxt + size * eyeSize, npyt);
    path.arc(npxt, npyt, size * eyeSize, 0, 2 * Math.PI);
    ctx.fill(path);
    ctx.stroke(path);

    // pupils
    const diff = angleDifference(angle, targetAngle);
    const effectiveDist = pupilFromEyeDistance * ((diff / Math.PI) / 2 + 0.5);
    ctx.fillStyle = 'black';
    path = new Path2D();
    path.arc(
        npx + Math.cos(targetAngle) * size * effectiveDist, 
        npy + Math.sin(targetAngle) * size * effectiveDist, 
        size * pupilSize, 
        0, 2 * Math.PI
    );
    path.arc(
        npxt + Math.cos(targetAngle) * size * effectiveDist, 
        npyt + Math.sin(targetAngle) * size * effectiveDist, 
        size * pupilSize, 
        0, 2 * Math.PI
    );
    ctx.fill(path);
}
