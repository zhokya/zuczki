import { projectileEncoder } from "../../shared/dataEncoders.js";
import type { PointedDataView } from "../../shared/encoder/types.js";
import { samplePointInCircle } from "../../shared/utils.js";
import type { VisionBounds } from "../../shared/visionBounds.js";
import env from "../env.js";
import type { Game } from "../game.js";
import type { Beetle } from "./beetle.js";
import { Point } from "./point.js";

const speed = 0.7;
const size = 0.3;
const freezeTicks = 24;

export class Projectile {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size = size;
    game: Game;
    id: number;
    isDead = false;

    constructor(beetle: Beetle, game: Game) {
        this.vx = Math.cos(beetle.angle) * speed;
        this.vy = Math.sin(beetle.angle) * speed;
        this.x = beetle.x + Math.cos(beetle.angle) * (beetle.size + 0.5);
        this.y = beetle.y + Math.sin(beetle.angle) * (beetle.size + 0.5);

        this.game = game;
        this.id = game.projectileId.next();
    }

    update() {
        this.x += this.vx;
        this.y += this.vy;

        if(this.x * this.x + this.y * this.y >= this.game.mapSize * this.game.mapSize) {
            this.onCollisionWithObject();
            return;
        }

        this.game.beetles.forEach(b => {
            const dx = b.x - this.x;
            const dy = b.y - this.y;
            const ds = b.size + this.size;
            if(dx * dx + dy * dy <= ds * ds) {
                b.freezedTicks = freezeTicks;
                this.onDead();
                return;
            }
        });

        this.game.rubys.forEach(r => {
            const dx = r.x - this.x;
            const dy = r.y - this.y;
            const ds = r.size + this.size;
            if(dx * dx + dy * dy <= ds * ds) {
                this.onCollisionWithObject();
                return;
            }
        });
    }

    onCollisionWithObject() {
        if(this.isDead) return;
        for(let i = 0; i < 16; i ++) {
            const [dx, dy] = samplePointInCircle(1);
            const x = this.x + dx - this.vx;
            const y = this.y + dy - this.vy;
            if(x * x + y * y >= this.game.mapSize * this.game.mapSize) continue;
            const point = new Point(x, y, false, this.game);
            this.game.points.set(point.id, point);
        }
        this.onDead();
    }

    onDead() {
        if(this.isDead) return;
        this.isDead = true;
        this.game.projectileId.unregister(this.id);
    }

    
    filterMessage(bounds: VisionBounds): boolean {
        return bounds.isInsideWithMargin(this.x, this.y, this.size + 2);
    }
    writeToBuffer(view: PointedDataView) {
        projectileEncoder.writeToBuffer(view, {
            id: this.id,
            x: this.x,
            y: this.y
        });
    }
}
