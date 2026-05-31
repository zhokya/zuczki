import { rubyEncoder } from "../../shared/dataEncoders.js";
import type { PointedDataView } from "../../shared/encoder/types.js";
import type { VisionBounds } from "../../shared/visionBounds.js";
import type { Game } from "../game.js";
import { infSum, vectorDecay, vectorMagnitudes } from "../sharedConstants.js";
import type { Beetle } from "./beetle.js";
import { Particle } from "./particle.js";

export const rubyProtectionTicks = 30;
const rubyVectorMagnitude = 0.2;

const decreaseHpSpeed = 0.0015;
const decreaseHpThreshold = 0.25;
export const minRubyHp = 0.15;

export class Ruby {
    id: number;
    game: Game;

    x: number;
    y: number;
    vx: number;
    vy: number;
    baseSize: number;
    hp: number = 1;
    protectionTicks: number = rubyProtectionTicks;

    constructor(x: number, y: number, vx: number, vy: number, baseSize: number, game: Game) {
        this.id = game.rubyId.next();
        this.game = game;

        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.baseSize = baseSize;
    }

    getSize() {
        return this.baseSize * this.hp;
    }
    get size() {
        return this.getSize();
    }

    sampleHpTaken() {
        return Math.random() * (Math.random() > 0.65 ? 0.3 : 0.4) + 0.1;
    }

    update(beetles: Map<string, Beetle>) {
        this.x += this.vx;
        this.y += this.vy;
        this.vx *= vectorDecay;
        this.vy *= vectorDecay;
        this.protectionTicks = Math.max(0, this.protectionTicks - 1);
        
        if (this.hp > decreaseHpThreshold) {
            this.hp -= decreaseHpSpeed / (this.baseSize * this.baseSize);
        }

        // Collision with world edge
        const maxr = this.game.mapSize - this.getSize();
        if (this.x * this.x + this.y * this.y > maxr * maxr) {
            const norm = Math.sqrt(this.x * this.x + this.y * this.y);
            const normx = this.x / norm;
            const normy = this.y / norm;
            this.x = normx * maxr;
            this.y = normy * maxr;

            this.vx = -vectorMagnitudes.mapEdgeCollision.position * normx;
            this.vy = -vectorMagnitudes.mapEdgeCollision.position * normy;
        }

        // Collisions with beetles
        // Many beetles can collide in the same tick, so we handle all of them at once to be fair
        const collisions: [Beetle, number, number][] = [];
        beetles.forEach(b => {
            const dx = this.x - b.x;
            const dy = this.y - b.y;
            const ds = this.getSize() + b.size;

            if (dx * dx + dy * dy <= ds * ds) {
                const norm = Math.sqrt(dx * dx + dy * dy);
                const ndx = dx / norm;
                const ndy = dy / norm;

                b.x -= ndx * (ds - norm);
                b.y -= ndy * (ds - norm);

                collisions.push([b, ndx, ndy]);
            }
        });

        if(collisions.length == 0 || this.protectionTicks > 0) return;

        let hpTakenPerHit = this.sampleHpTaken();
        const removeSelf = this.hp - hpTakenPerHit * collisions.length < minRubyHp;
        if(removeSelf) {
            hpTakenPerHit = this.hp / collisions.length;
        }

        collisions.forEach(collision => {
            const [b, ndx, ndy] = collision;

            this.vx += ndx * rubyVectorMagnitude;
            this.vy += ndy * rubyVectorMagnitude;

            b.vx -= ndx * vectorMagnitudes.ruby.position * hpTakenPerHit;
            b.vy -= ndy * vectorMagnitudes.ruby.position * hpTakenPerHit;
            b.vsize += vectorMagnitudes.ruby.size * hpTakenPerHit;
            b.score += Math.round(100 * hpTakenPerHit * this.baseSize * this.baseSize);

            this.game.particles.push(new Particle(
                this.x - ndx * this.getSize(),
                this.y - ndy * this.getSize(),
                vectorMagnitudes.ruby.size * hpTakenPerHit * infSum,
                removeSelf ? 'rubyRemoval' : 'ruby'
            ));
        });

        this.protectionTicks = rubyProtectionTicks;

        if(removeSelf) {
            this.hp = -1;
        } else {
            this.hp -= hpTakenPerHit * collisions.length;
        }
    }

    onDead() {
        this.game.rubyId.unregister(this.id);
    }


    filterMessage(bounds: VisionBounds): boolean {
        return bounds.isInsideWithMargin(this.x, this.y, this.baseSize + 2);
    }
    writeToBuffer(view: PointedDataView) {
        rubyEncoder.writeToBuffer(view, {
            id: this.id,
            x: this.x,
            y: this.y,
            baseSize: this.baseSize,
            hp: this.hp,
            protection: this.protectionTicks / rubyProtectionTicks
        });
    }
}
