import { getRandomLook, getRandomNickname, type Looks } from "../../shared/looks.js";
import { angleDifference, rotateAngleTowards, samplePointInCircle } from "../../shared/utils.js";
import env from "../env.js";
import type { Game } from "../game.js";
import { infSum, vectorDecay, vectorMagnitudes } from "../sharedConstants.js";
import { Point } from "./point.js";
import { Ruby } from "./ruby.js";

const minSpeed = 0.35;
const maxSpeed = 0.4;
const sizeIncreaseSpeed = 0.001;
const minPossibleSize = 0.75;
const magnitude1 = 0.12;
const magnitude2 = 0.005;
const maxDashDirectionChange = Math.PI / 5;
const maxSize = parseFloat(env('VITE_MAX_SIZE'));
const mapSize = parseInt(env('VITE_MAP_SIZE'));
const irrelevanceTicks = 24;
const beetleCollisionAngleZeroPoint = 0.25;

function shiftX(x: number, zeroPoint: number) {
    return (x - zeroPoint) / (1 - zeroPoint * x);
}
function getHitQuality(dot: number) {
    // dot is the cosine of the angle (dot product of normalized vectors)
    const scaledAngle = 1 - Math.acos(dot) * 2 / Math.PI;
    return shiftX(scaledAngle, beetleCollisionAngleZeroPoint);
}

(() => {
    const numTicks = 10000;

    let x = 0;
    let vx = 0;
    for (let i = 0; i < numTicks; i++) {
        const speed = minSpeed * Math.max(0, Math.min(1, (vx - magnitude1) / (magnitude2 - magnitude1)));
        x += speed + vx;
        vx *= vectorDecay;
        if (vx < magnitude1) {
            vx += vectorMagnitudes.click.position;
        }
    }

    console.log('Speed without clicking: ' + minSpeed.toFixed(4));
    console.log('Speed with constant clicking: ' + (x / numTicks).toFixed(4));
    console.log('');
})();

export class Beetle {
    // state
    x: number;
    y: number;
    size: number = 1;
    angle: number;

    vx: number = 0;
    vy: number = 0;
    vsize: number = 0;

    score: number = 0;
    irrelevants: { id: string, ticks: number }[] = [];

    // decissions
    targetAngle: number;
    clicked: boolean = false;

    // other
    game: Game;
    id: string;
    lastBrainActive: number;
    looks: Looks;
    globId: number;

    constructor(id: string, isBot: boolean, game: Game, looks?: Looks) {
        const [x, y] = game.getSpawnPointWithMargin(4);
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
    }

    update() {
        const magnitude = Math.sqrt(this.vx * this.vx + this.vy * this.vy);

        const rotationSpeed = 0.12 / this.size;
        const speedMultiplier = 1 + (maxSpeed / minSpeed - 1) * (this.size - 1) / (maxSize - 1);
        const speed = minSpeed * speedMultiplier * Math.max(0, Math.min(1, (magnitude - magnitude1) / (magnitude2 - magnitude1)));

        this.angle = rotateAngleTowards(this.angle, this.targetAngle, rotationSpeed);

        this.x += speed * Math.cos(this.angle) + this.vx;
        this.y += speed * Math.sin(this.angle) + this.vy;
        this.size = Math.max(minPossibleSize, this.size + sizeIncreaseSpeed + this.vsize);

        this.vx *= vectorDecay;
        this.vy *= vectorDecay;
        this.vsize *= vectorDecay;

        // Collision with world edge
        const maxr = mapSize - this.size;
        if (this.x * this.x + this.y * this.y > maxr * maxr) {
            const norm = Math.sqrt(this.x * this.x + this.y * this.y);
            const normx = this.x / norm;
            const normy = this.y / norm;
            this.x = normx * maxr;
            this.y = normy * maxr;

            this.vx = -vectorMagnitudes.mapEdgeCollision.position * normx;
            this.vy = -vectorMagnitudes.mapEdgeCollision.position * normy;
            this.vsize += vectorMagnitudes.mapEdgeCollision.size;
        }

        // Dashing
        if (this.clicked) {
            this.clicked = false;
            if (magnitude < magnitude1) {
                const jumpAngle = rotateAngleTowards(
                    this.angle,
                    this.targetAngle,
                    Math.min(angleDifference(this.angle, this.targetAngle), maxDashDirectionChange)
                );
                this.vx += Math.cos(jumpAngle) * speedMultiplier * vectorMagnitudes.click.position;
                this.vy += Math.sin(jumpAngle) * speedMultiplier * vectorMagnitudes.click.position;
                this.vsize += vectorMagnitudes.click.size;
            }
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
                Math.cos(this.angle) * 1.2 * infSum,
                Math.sin(this.angle) * 1.2 * infSum,
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

        this.game.globId.unregister(this.globId);
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

        this.vx -= vectorMagnitudes.beetleCollision.position * ndx;
        this.vy -= vectorMagnitudes.beetleCollision.position * ndy;
        this.vsize -= vectorMagnitudes.beetleCollision.size * scoreB;
        this.score += Math.max(0, Math.round(67.4 * scoreB));

        other.vx += vectorMagnitudes.beetleCollision.position * ndx;
        other.vy += vectorMagnitudes.beetleCollision.position * ndy;
        other.vsize -= vectorMagnitudes.beetleCollision.size * scoreO;
        other.score += Math.max(0, Math.round(67.4 * scoreO));
    }
}
