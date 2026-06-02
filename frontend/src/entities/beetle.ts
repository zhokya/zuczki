import type { MessageBeetle } from "../../../shared/dataEncoders";
import { type Looks, colors } from "../../../shared/looks";
import { powerups } from "../../../shared/powerups";
import { angleDifference, lerp } from "../../../shared/utils";
import { Interpolator } from "../interpolator";
import type { RenderInfo } from "../renderInfo";
import { renderProjectile } from "./projectile";

const motionBlurSteps = 10;

const minWingOffset = 0.02;
const maxWingOffset = 0.4;
const wingSpeed = 4.5;
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

function getBeetleWingOffset(accumWingTimestep: number) {
    let t = Math.sin(accumWingTimestep * Math.PI * 2);
    t = (t + 1) / 2;
    return t;
}
function getBeetleWingPeriod(accumWingTimestep: number) {
    return Math.round(2 * accumWingTimestep);
}
function insideSize(timestep: number) {
    let t = Math.sin(timestep * insideBreathingSpeed / 1000 * Math.PI * 2);
    t = Math.sin(t * Math.PI / 2);
    t = (t + 1) / 2;
    const area = t * maxInsideRadius * maxInsideRadius + (1 - t) * minInsideRadius * minInsideRadius;
    return Math.sqrt(area);
}

export class Beetle {
    x: Interpolator;
    y: Interpolator;
    size: Interpolator;
    angle: Interpolator;
    targetAngle: Interpolator;
    powerupTicks: Interpolator;
    score: number;

    id: number;
    powerupNumber: number;

    accumWingTimestep = 0;

    constructor(b: MessageBeetle) {
        this.x = new Interpolator(b.x, false);
        this.y = new Interpolator(b.y, false);
        this.size = new Interpolator(b.size, false);
        this.angle = new Interpolator(b.angle, true);
        this.targetAngle = new Interpolator(b.targetAngle, true);
        this.powerupTicks = new Interpolator(b.powerupTicks, false);
        this.score = b.score;

        this.id = b.id;
        this.powerupNumber = b.powerupNumber;
    }

    update(b: MessageBeetle) {
        this.x.update(b.x);
        this.y.update(b.y);
        this.size.update(b.size);
        this.angle.update(b.angle);
        this.targetAngle.update(b.targetAngle);
        this.powerupTicks.update(b.powerupTicks);
        this.score = b.score;

        this.id = b.id;
        this.powerupNumber = b.powerupNumber;
    }

    onRender() {
        this.x.onRender();
        this.y.onRender();
        this.size.onRender();
        this.angle.onRender();
        this.targetAngle.onRender();
        this.powerupTicks.onRender();
    }

    getPowerupLoad(loadingSpeed: number) {
        const x = Math.exp(-this.powerupTicks.value * loadingSpeed);
        const eps = 0.005;
        return 1 - (Math.max(eps, x) - eps) / (1 - eps);
    }

    render(renderInfo: RenderInfo, looks: Looks | undefined) {
        if (looks === undefined) {
            // server skill issue, this should never happen
            looks = {
                mainColor: renderInfo.t % 1000 > 500 ? 3 : 36,
                insideColor: 56,
                antennaColor: 3,
                antennaDots: false,
                antennaSize: 0,
                nickname: ''
            };
        }

        const { ctx, prevT, t, scale } = renderInfo;
        const x = this.x.value;
        const y = this.y.value;
        const angle = this.angle.value;
        const targetAngle = this.targetAngle.value;
        const size = this.size.value;
        const powerupType = this.powerupNumber >= 0 && this.powerupNumber < powerups.length ? powerups[this.powerupNumber] : '';

        const cpx = x - Math.cos(angle) * size * wingCenterDistance;
        const cpy = y - Math.sin(angle) * size * wingCenterDistance;

        let minWingOffsetFixed = minWingOffset;
        let maxWingOffsetFixed = maxWingOffset;
        let wingSpeedFixed = wingSpeed;
        if(powerupType == 'protectSize') {
            minWingOffsetFixed = lerp(minWingOffset, 0.05, this.getPowerupLoad(0.24));
            maxWingOffsetFixed = lerp(maxWingOffset, 0.05, this.getPowerupLoad(0.24));
        } else if(powerupType == 'rotateFaster') {
            wingSpeedFixed = lerp(wingSpeed, 7, this.getPowerupLoad(0.18));
        } else if(powerupType == 'dash') {
            const t = this.getPowerupLoad(0.04);
            wingSpeedFixed = lerp(wingSpeed, 1, t);
            minWingOffsetFixed = lerp(minWingOffset, 0.5, t);
            maxWingOffsetFixed = lerp(maxWingOffset, 0.5, t);
        }
        const prevAccumWingTimestep = this.accumWingTimestep;
        this.accumWingTimestep = (this.accumWingTimestep + (t - prevT) * wingSpeedFixed / 1000) % 1;
        let offsetFrom = lerp(minWingOffsetFixed, maxWingOffsetFixed, getBeetleWingOffset(prevAccumWingTimestep));
        let offsetTo = lerp(minWingOffsetFixed, maxWingOffsetFixed, getBeetleWingOffset(this.accumWingTimestep));
        if (offsetTo > offsetFrom) {
            [offsetFrom, offsetTo] = [offsetTo, offsetFrom];
        }
        if (getBeetleWingPeriod(prevAccumWingTimestep) !== getBeetleWingPeriod(this.accumWingTimestep)) {
            // Either maxWingOffset or minWingOffset
            // Fix animation by putting offset range to max range
            if (offsetTo > (maxWingOffsetFixed + minWingOffsetFixed) / 2) {
                offsetFrom = maxWingOffsetFixed;
            } else {
                offsetTo = minWingOffsetFixed;
            }
        }

        // shadow
        ctx.shadowBlur = scale * 0.1 * size;
        ctx.shadowColor = 'rgba(0,0,0,0.4)';
        ctx.fillStyle = 'rgb(0,0,0)';
        ctx.beginPath();
        const a1 = angle - Math.PI + Math.max(offsetFrom, offsetTo) + 0.02;
        const a2 = angle + Math.PI - Math.max(offsetFrom, offsetTo) - 0.02;
        ctx.arc(x, y, size * 0.99, a1, a2);
        ctx.arc(x, y, size * insideSize(t) * 0.99, a2, a1);
        ctx.fill();
        ctx.shadowColor = 'rgba(0,0,0,0)';
        ctx.shadowBlur = 0;

        // antenna
        const ax = size;
        const ay = -size * antennaSeparation;
        const bx = ax + size * looks.antennaSize * 1.2;
        const by = ay - size * looks.antennaSize * 0.1;
        const cx = ax + size * looks.antennaSize * 1.5;
        const cy = ay - size * looks.antennaSize * 0.8;

        ctx.save();
        ctx.translate(x, y);
        ctx.rotate(angle);
        ctx.strokeStyle = colors[looks.antennaColor];
        ctx.lineCap = 'round';
        ctx.lineWidth = size / 10;
        if (looks.antennaSize > 0) {
            const path = new Path2D();
            path.moveTo(ax, ay);
            path.quadraticCurveTo(bx, by, cx, cy);
            path.moveTo(ax, -ay);
            path.quadraticCurveTo(bx, -by, cx, -cy);
            ctx.stroke(path);
        }
        if (looks.antennaDots) {
            const path = new Path2D();
            path.moveTo(cx, cy);
            path.arc(cx, cy, size * antennaDotsSize, 0, 2 * Math.PI);
            path.moveTo(cx, -cy);
            path.arc(cx, -cy, size * antennaDotsSize, 0, 2 * Math.PI);
            ctx.fillStyle = colors[looks.antennaColor];
            ctx.fill(path);
        }
        ctx.restore();

        // inside body
        ctx.fillStyle = colors[looks.insideColor];
        ctx.beginPath();
        ctx.arc(x, y, size * insideSize(t), 0, Math.PI * 2);
        ctx.fill();

        // main body
        ctx.fillStyle = colors[looks.mainColor];
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
        let npx = x + Math.cos(angle - eyeSeparationAngle / 2) * size * eyeFromCenterDistance;
        let npy = y + Math.sin(angle - eyeSeparationAngle / 2) * size * eyeFromCenterDistance;
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

        // ctx.fillStyle = 'purple';
        // ctx.fillRect(x + Math.cos(Math.PI / 2) * size - 10, y + Math.sin(Math.PI / 2) * size - 10, 20, 20);
        // ctx.fillRect(x + Math.cos(Math.PI / 2 * (1 - 1)) * size - 10, y + Math.sin(Math.PI / 2 * (1 - 1)) * size - 10, 20, 20);
        // ctx.fillRect(x + Math.cos(Math.PI / 2 * (1 - 0.5)) * size - 10, y + Math.sin(Math.PI / 2 * (1 - 0.5)) * size - 10, 20, 20);
        // ctx.fillRect(x + Math.cos(Math.PI / 2 * (1 - 0.33)) * size - 10, y + Math.sin(Math.PI / 2 * (1 - 0.33)) * size - 10, 20, 20);
        // ctx.fillRect(x + Math.cos(Math.PI / 2 * (1 - 0.66)) * size - 10, y + Math.sin(Math.PI / 2 * (1 - 0.66)) * size - 10, 20, 20);

        // projectile creation
        if(powerupType == 'projectile' && this.powerupTicks.value != 0) {
            const tt = this.powerupTicks.value / 50;
            const prx = x + Math.cos(angle) * (size + 0.7);
            const pry = y + Math.sin(angle) * (size + 0.7);

            ctx.lineWidth = 0.15;
            ctx.lineCap = 'round';
            ctx.strokeStyle = 'rgba(20,154,163,' + Math.min(1, tt * 10) + ')';
            ctx.beginPath();
            ctx.arc(prx, pry, 0.5, angle, angle + Math.PI * 2 * tt);
            ctx.stroke();

            if(this.powerupTicks.uninterpolatedValue != 0) {
                renderProjectile(renderInfo, prx, pry, (Math.pow(tt, 0.3) - 1) * 15, Math.min(1, tt * 5));
            }
        }
    }
}
