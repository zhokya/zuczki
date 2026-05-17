import env from "../env.js";
import type { Game } from "../game.js";
import { vectorDecay, vectorMagnitudes } from "../sharedConstants.js";
import type { Beetle } from "./beetle.js";

export const rubyProtectionTicks = 30;
const rubyVectorMagnitude = 0.1;
const mapSize = parseInt(env('VITE_MAP_SIZE'));

const decreaseHpSpeed = 0.0015;
const decreaseHpThreshold = 0.25;
const minRubyHp = 0.15;

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

    sampleHpTaken() {
        return Math.random() * 0.3 + 0.1;
    }

    // Many beetles can collide in the same tick, so we handle all of them at once to be fair
    update(beetles: Map<string, Beetle>) {
        let anyHits = false;
        let totalHpTaken = 0;

        if(this.hp > decreaseHpThreshold) {
            this.hp -= decreaseHpSpeed;
        }

        const removeIfHit = this.hp - this.sampleHpTaken() < minRubyHp;

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

                const hp = removeIfHit ? this.hp : Math.min(this.hp - minRubyHp, this.sampleHpTaken());

                this.vx += ndx * rubyVectorMagnitude;
                this.vy += ndx * rubyVectorMagnitude;
                anyHits = true;
                totalHpTaken += hp;

                b.vx -= ndx * vectorMagnitudes.ruby.position * hp;
                b.vy -= ndy * vectorMagnitudes.ruby.position * hp;
                b.vsize += vectorMagnitudes.ruby.size * hp;
                b.score += Math.round(100 * hp * this.baseSize * this.baseSize);
            }
        });

        if (anyHits) {
            this.protectionTicks = rubyProtectionTicks;
            if(removeIfHit) {
                this.hp = -1;
            }
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

    onDead() {
        this.game.rubyId.unregister(this.id);
    }
}
