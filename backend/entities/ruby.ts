import env from "../env.js";
import { vectorDecay, vectorMagnitudes } from "../sharedConstants.js";
import type { Beetle } from "./beetle.js";

export const rubyProtectionTicks = 30;
const rubyVectorMagnitude = 0.1;
const mapSize = parseInt(env('VITE_MAP_SIZE'));

export class Ruby {
    id: number;
    x: number;
    y: number;
    vx: number;
    vy: number;
    baseSize: number;
    hp: number = 1;
    protectionTicks: number = rubyProtectionTicks;

    constructor(id: number, x: number, y: number, vx: number, vy: number, baseSize: number) {
        this.id = id;
        this.x = x;
        this.y = y;
        this.vx = vx;
        this.vy = vy;
        this.baseSize = baseSize;
    }

    getSize() {
        return this.baseSize * this.hp;
    }

    // Many beetles can collide in the same tick, so we handle all of them at once to be fair
    update(beetles: Map<string, Beetle>) {
        let removeRuby = false;
        let applyProtection = false;
        let totalHpTaken = 0;

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

                if (this.protectionTicks > 0) return;

                let hp = Math.random() * 0.3 + 0.1;

                if (this.hp - hp < 0.15) {
                    removeRuby = true;
                    hp = this.hp;
                } else {
                    this.vx += ndx * rubyVectorMagnitude;
                    this.vy += ndx * rubyVectorMagnitude;
                    applyProtection = true;
                    totalHpTaken += hp;
                }

                b.vx -= ndx * vectorMagnitudes.ruby.position * hp;
                b.vy -= ndy * vectorMagnitudes.ruby.position * hp;
                b.vsize += vectorMagnitudes.ruby.size * hp;
                b.score += Math.round(100 * hp * this.baseSize * this.baseSize);
            }
        });

        if (removeRuby) {
            this.hp = -1;
        }
        if (applyProtection) {
            this.protectionTicks = rubyProtectionTicks;
        }
        this.hp -= totalHpTaken;

        this.x += this.vx;
        this.y += this.vy;
        this.vx *= vectorDecay;
        this.vy *= vectorDecay;
        this.protectionTicks = Math.max(0, this.protectionTicks - 1);

        // Collision with world edge
        const maxr = mapSize - this.baseSize * this.hp;
        if (this.x * this.x + this.y * this.y > maxr * maxr) {
            const norm = Math.sqrt(this.x * this.x + this.y * this.y);
            const normx = this.x / norm;
            const normy = this.y / norm;
            this.x = normx * maxr;
            this.y = normy * maxr;

            this.vx = -vectorMagnitudes.mapEdgeCollision.position * normx;
            this.vy = -vectorMagnitudes.mapEdgeCollision.position * normy;
        }
    }
}
