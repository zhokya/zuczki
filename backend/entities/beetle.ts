import { beetleEncoder } from "../../shared/dataEncoders.js";
import type { PointedDataView } from "../../shared/encoder/types.js";
import { getRandomLook, getRandomNickname, type Looks } from "../../shared/looks.js";
import { powerups } from "../../shared/powerups.js";
import { angleDifference, binarySearch, lerp, rotateAngleTowards, samplePointInCircle } from "../../shared/utils.js";
import type { VisionBounds } from "../../shared/visionBounds.js";
import env from "../env.js";
import type { Game } from "../game.js";
import {
    vectorMagnitudes,
    infSum, vectorDecay,
    minSpeed, maxSpeed, clickSpeed, magnitude1, magnitude2,
    getAverageDashDistance, getAverageDashDuration,
} from "../sharedConstants.js";
import { Particle } from "./particle.js";
import { Point } from "./point.js";
import { Projectile } from "./projectile.js";
import { Ruby } from "./ruby.js";

const sizeIncreaseSpeed = 0.001;
const minPossibleSize = 0.75;
const maxDashDirectionChange = Math.PI / 5;
const maxSize = parseFloat(env('VITE_MAX_SIZE'));
const irrelevanceTicks = 24;
const beetleCollisionAngleZeroPoint = 0.25;
const movementSubTicks = 50;
const subVectorDecay = Math.pow(vectorDecay, 1 / movementSubTicks);

const powerupParams = {
    protectSize: {
        sizeReduction: 0.4,
        rotSpeedMult: 0.2
    },
    rotateFaster: {
        rotSpeedMult: 1.6
    },
    dash: {
        maxDistance: 40
    },
    projectile: {
        loadingDuration: 50,
        hitSpeedMult: 0.12,
        hitRotSpeedMult: 0.02
    }
};
const maxSuperdashTicks = powerupParams.dash.maxDistance / clickSpeed - getAverageDashDuration(powerupParams.dash.maxDistance / infSum);

function shiftX(x: number, zeroPoint: number) {
    return (x - zeroPoint) / (1 - zeroPoint * x);
}
function getHitQuality(dot: number) {
    // dot is the cosine of the angle (dot product of normalized vectors)
    const scaledAngle = 1 - Math.acos(dot) * 2 / Math.PI;
    return shiftX(scaledAngle, beetleCollisionAngleZeroPoint);
}

export class Beetle {
    // state
    x: number;
    y: number;
    size = 1;
    angle: number;

    vx = 0;
    vy = 0;
    vsize = 0;

    score = 0;
    irrelevants: { id: string, ticks: number }[] = [];
    powerupTicks: number | null = null;
    freezedTicks: number = 0;

    // decissions
    targetAngle: number;
    clicked = false;
    poweruping = false;
    powerupType: string;
    powerupNumber: number;

    // other
    game: Game;
    id: string;
    lastBrainActive: number;
    looks: Looks;
    globId: number;

    constructor(id: string, isBot: boolean, game: Game, powerupNumber?: number, looks?: Looks) {
        const [x, y] = game.tournament === null ? game.getSpawnPointWithMargin(4) : game.getSpawnPointWithMargin(50, 5);
        this.x = x;
        this.y = y;

        const initialAngle = Math.random() * Math.PI * 2;
        this.angle = initialAngle;
        this.targetAngle = initialAngle;

        this.game = game;
        this.id = id;
        this.lastBrainActive = isBot ? -1e9 : performance.now();

        this.globId = game.globId.next();
        this.looks = looks === undefined ? getRandomLook(isBot ? getRandomNickname() : '') : looks;
        game.looksMapIdEdits.push(id);
        
        if(powerupNumber === undefined || powerupNumber < 0 || powerupNumber >= powerups.length) {
            powerupNumber = Math.floor(Math.random() * powerups.length);
        }
        this.powerupNumber = powerupNumber;
        this.powerupType = powerups[powerupNumber];
    }

    getPowerupLoad(loadingSpeed: number) {
        if(this.powerupTicks === null) return 0;
        return 1 - Math.exp(-this.powerupTicks * loadingSpeed);
    }

    getSpeedMultBySize() {
        return 1 + (maxSpeed / minSpeed - 1) * (this.size - 1) / (maxSize - 1);
    }

    update() {
        let magnitude = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        const speedMultBySize = this.getSpeedMultBySize();
        const speedMultByPowerup = 1 - this.getPowerupLoad(0.22);
        const speedMultByFreeze = this.freezedTicks > 0 ? powerupParams.projectile.hitSpeedMult : 1;

        // Powerup
        this.freezedTicks = Math.max(0, this.freezedTicks - 1);
        const dashAngle = rotateAngleTowards(
            this.angle,
            this.targetAngle,
            Math.min(angleDifference(this.angle, this.targetAngle), maxDashDirectionChange)
        );
        const dashRelease = this.powerupType == 'dash' && this.powerupTicks !== null && this.powerupTicks >= maxSuperdashTicks;
        if(this.poweruping && !dashRelease) {
            if(!(this.powerupTicks === null && this.powerupType == 'dash' && (magnitude >= magnitude1 || this.freezedTicks != 0))) {
                if(this.powerupTicks === null) this.powerupTicks = 0;
                this.powerupTicks++;
            }
        } else {
            if(this.powerupTicks !== null) {
                if(this.powerupType == 'dash') {
                    const mag = binarySearch(
                        x => getAverageDashDistance(x) / (getAverageDashDuration(x) + (this.powerupTicks as number)),
                        clickSpeed, 0, 1e6
                    ).x;
                    this.vx += Math.cos(dashAngle) * speedMultBySize * mag;
                    this.vy += Math.sin(dashAngle) * speedMultBySize * mag;
                    this.vsize += vectorMagnitudes.click.size;
                } else if(this.powerupType == 'projectile') {
                    if(this.powerupTicks >= powerupParams.projectile.loadingDuration) {
                        const projectile = new Projectile(this, this.game);
                        this.game.projectiles.set(projectile.id, projectile);
                    }
                }
                this.powerupTicks = null;
            }
        }
        
        let rotSpeedMult = 1;
        if(this.powerupType == 'protectSize') {
            rotSpeedMult = lerp(1, powerupParams.protectSize.rotSpeedMult, this.getPowerupLoad(0.3));
        } else if(this.powerupType == 'rotateFaster') {
            rotSpeedMult = lerp(1, powerupParams.rotateFaster.rotSpeedMult, this.getPowerupLoad(0.18));
        } else if(this.powerupType == 'dash') {
            rotSpeedMult = lerp(1, 0.1, this.getPowerupLoad(0.1));
        } else {
            rotSpeedMult = lerp(1, 0.67, this.getPowerupLoad(0.1));
        }
        if(this.freezedTicks != 0) {
            rotSpeedMult *= powerupParams.projectile.hitRotSpeedMult;
        }
        const rotationSpeed = rotSpeedMult * 0.12 / this.size;

        // Dashing
        if (this.clicked && !this.poweruping && this.freezedTicks == 0) {
            if (magnitude < magnitude1) {
                this.vx += Math.cos(dashAngle) * speedMultBySize * vectorMagnitudes.click.position;
                this.vy += Math.sin(dashAngle) * speedMultBySize * vectorMagnitudes.click.position;
                this.vsize += vectorMagnitudes.click.size;
            }
        }

        // General movement
        this.angle = rotateAngleTowards(this.angle, this.targetAngle, rotationSpeed);
        this.size = Math.max(minPossibleSize, this.size + sizeIncreaseSpeed + this.vsize);
        this.vsize *= vectorDecay;

        for(let i = 0; i < movementSubTicks; i ++) {
            const speedMultByVector = Math.max(0, Math.min(1, (magnitude - magnitude1) / (magnitude2 - magnitude1)));
            const speed = minSpeed * speedMultBySize * speedMultByVector * speedMultByPowerup;

            this.x += (speed * Math.cos(this.angle) + this.vx) / movementSubTicks * speedMultByFreeze;
            this.y += (speed * Math.sin(this.angle) + this.vy) / movementSubTicks * speedMultByFreeze;

            this.vx *= subVectorDecay;
            this.vy *= subVectorDecay;

            magnitude = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        }

        // Collision with world edge
        const maxr = this.game.mapSize - this.size;
        if (this.x * this.x + this.y * this.y > maxr * maxr) {
            const norm = Math.sqrt(this.x * this.x + this.y * this.y);
            const normx = this.x / norm;
            const normy = this.y / norm;
            this.x = normx * maxr;
            this.y = normy * maxr;

            this.vx = -vectorMagnitudes.mapEdgeCollision.position * normx;
            this.vy = -vectorMagnitudes.mapEdgeCollision.position * normy;
            this.vsize += vectorMagnitudes.mapEdgeCollision.size;

            this.game.particles.push(new Particle(
                normx * this.game.mapSize, normy * this.game.mapSize, 
                vectorMagnitudes.mapEdgeCollision.size * infSum,
                'nonRuby'
            ));
        }

        // Irrelevances to other beetles
        for (let i = this.irrelevants.length - 1; i >= 0; i--) {
            this.irrelevants[i].ticks++;
            if (this.irrelevants[i].ticks > irrelevanceTicks) {
                this.irrelevants.splice(i, 1);
            }
        }
    }

    onDead() {
        let numPoints = Math.floor(this.score * 0.9);

        const createRuby = Math.random() < (numPoints - 50) / (150 - 50);

        if (numPoints > 150) {
            numPoints = 150 + 5 * Math.sqrt(numPoints - 150);
        }

        if (createRuby) {
            const rubyPoints = (Math.random() * 0.3 + 0.4) * numPoints;
            numPoints -= rubyPoints;

            const ruby = new Ruby(
                this.x,
                this.y,
                Math.cos(this.angle) * 1.2 / infSum,
                Math.sin(this.angle) * 1.2 / infSum,
                Math.sqrt(rubyPoints / 100),
                this.game
            );
            this.game.rubys.set(ruby.id, ruby);
        }

        for (let i = 0; i < Math.max(0, numPoints) + 10; i++) {
            const [px, py] = samplePointInCircle(this.size);
            const point = new Point(px + this.x, py + this.y, false, this.game);
            this.game.points.set(point.id, point);
        }

        this.game.particles.push(new Particle(
            this.x, this.y, this.size, 'death'
        ));

        this.game.globId.unregister(this.globId);
    }

    // Protect from increasing size with powerup
    sizeDeltaWithProtection(delta: number) {
        if(delta < 0) return delta;
        if(this.powerupType == 'protectSize' && this.powerupTicks !== null && this.powerupTicks > 0) {
            return delta * lerp(1, 1 - powerupParams.protectSize.sizeReduction, this.getPowerupLoad(0.24));
        }
        return delta;
    }

    handleBeetleCollision(other: Beetle) {
        const dx = other.x - this.x;
        const dy = other.y - this.y;
        const ds = other.size + this.size;

        if (dx * dx + dy * dy > ds * ds) return;

        const norm = Math.sqrt(dx * dx + dy * dy);
        const ndx = dx / norm;
        const ndy = dy / norm;

        this.x -= ndx * (ds - norm) / 2;
        this.y -= ndy * (ds - norm) / 2;
        other.x += ndx * (ds - norm) / 2;
        other.y += ndy * (ds - norm) / 2;

        for (let i = this.irrelevants.length - 1; i >= 0; i--) {
            if (this.irrelevants[i].id == other.id) return;
        }
        this.irrelevants.push({
            id: other.id,
            ticks: 0
        });

        const qualityB = getHitQuality(Math.cos(this.angle) * (-ndx) + Math.sin(this.angle) * (-ndy));
        const qualityO = getHitQuality(Math.cos(other.angle) * ndx + Math.sin(other.angle) * ndy);

        const scoreB = qualityO - (qualityB > 0 ? qualityB : 0);
        const scoreO = qualityB - (qualityO > 0 ? qualityO : 0);

        const deltaB = this.sizeDeltaWithProtection(-vectorMagnitudes.beetleCollision.size * scoreB);
        const deltaO = other.sizeDeltaWithProtection(-vectorMagnitudes.beetleCollision.size * scoreO);

        this.vx -= vectorMagnitudes.beetleCollision.position * ndx;
        this.vy -= vectorMagnitudes.beetleCollision.position * ndy;
        this.vsize += deltaB;
        this.score += Math.max(0, Math.round(67.4 * scoreB));

        other.vx += vectorMagnitudes.beetleCollision.position * ndx;
        other.vy += vectorMagnitudes.beetleCollision.position * ndy;
        other.vsize += deltaO;
        other.score += Math.max(0, Math.round(67.4 * scoreO));

        const collisionX = this.x + ndx * this.size;
        const collisionY = this.y + ndy * this.size;
        this.game.particles.push(new Particle(
            collisionX, collisionY,
            Math.max(deltaB, deltaO) * infSum,
            'nonRuby',
            [this.globId, other.globId], null
        ));
        this.game.particles.push(new Particle(
            collisionX, collisionY,
            deltaB * infSum,
            'nonRuby',
            [], this.globId
        ));
        this.game.particles.push(new Particle(
            collisionX, collisionY,
            deltaO * infSum,
            'nonRuby',
            [], other.globId
        ));
    }

    getUint8MotionBlur() {
        const magnitude = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        const speed = minSpeed * this.getSpeedMultBySize();
        if(magnitude <= speed) return 0;
        const motionBlur = 1 - 1 / (1 + 2 * (magnitude - speed));
        return Math.max(0, Math.min(255, Math.round(motionBlur * 255)));
    }


    filterMessage(bounds: VisionBounds): boolean {
        return bounds.isInsideWithMargin(this.x, this.y, this.size * 1.5 + 1);
    }
    writeToBuffer(view: PointedDataView) {
        beetleEncoder.writeToBuffer(view, {
            x: this.x,
            y: this.y,
            angle: this.angle,
            size: this.size,
            score: this.score,
            targetAngle: this.targetAngle,
            globId: this.globId,
            powerupNumber: this.powerupNumber,
            powerupTicks: this.powerupTicks === null ? 0 : Math.min(255, this.powerupTicks)
        });
    }
}
