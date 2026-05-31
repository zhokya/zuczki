import { defaultAspect, getVisibleArea } from "../../shared/getVisibleArea.js";
import { lerp, moduloAngle, rotateAngleTowards, samplePointInCircle } from "../../shared/utils.js";
import env from "../env.js";
import type { Beetle } from "./beetle.js";

const maxRadius = parseInt(env('VITE_MAP_SIZE')) - getVisibleArea(null) / 2 * Math.sqrt(1 + defaultAspect * defaultAspect);
const cameraSpeed = 0.04;
const ticksToStartMovingAfterDeath = 80;

export class Camera {
    x: number;
    y: number;
    targetX: number;
    targetY: number;
    angle: number;
    unaliveT = 1e9;

    constructor() {
        [this.x, this.y] = samplePointInCircle(maxRadius);
        [this.targetX, this.targetY] = samplePointInCircle(maxRadius);
        this.angle = this.angleToTarget();
    }

    angleToTarget() {
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        return moduloAngle(Math.atan2(dy, dx));
    }
    distanceToTarget() {
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        return Math.sqrt(dx * dx + dy * dy);
    }

    update(beetle: Beetle | undefined) {
        if (beetle !== undefined) {
            this.x = beetle.x;
            this.y = beetle.y;
            this.unaliveT = 0;
        } else {
            this.unaliveT++;
            
            while (this.distanceToTarget() < 5) {
                [this.targetX, this.targetY] = samplePointInCircle(maxRadius);
            }

            const speed = cameraSpeed * Math.max(0, Math.min(1, this.unaliveT / ticksToStartMovingAfterDeath - 1));
            const angleSpeed = lerp(0.005, 0.02, Math.sqrt(this.x * this.x + this.y * this.y) / maxRadius);
            this.angle = rotateAngleTowards(this.angle, this.angleToTarget(), angleSpeed);
            this.x += Math.cos(this.angle) * speed;
            this.y += Math.sin(this.angle) * speed;
        }
    }
}

export class TournamentCamera {
    x: number;
    y: number;
    theta: number;
    unaliveT = 1e9;

    constructor() {
        this.theta = Math.random() * Math.PI * 2;
        [this.x, this.y] = this.getTargetPosition();
    }

    getTargetPosition(): [number, number] {
        return [Math.cos(this.theta) * 10, Math.sin(this.theta) * 10];
    }

    update(beetle: Beetle | undefined) {
        if (beetle !== undefined) {
            this.x = beetle.x;
            this.y = beetle.y;
            this.unaliveT = 0;
        } else {
            this.unaliveT++;

            this.theta += 0.01;
            
            const speed = this.unaliveT <= ticksToStartMovingAfterDeath ? 0 : Math.min(1, (this.unaliveT / ticksToStartMovingAfterDeath - 1) / 20);
            const [targetX, targetY] = this.getTargetPosition();
            this.x = lerp(this.x, targetX, speed);
            this.y = lerp(this.y, targetY, speed);
        }
    }
}
