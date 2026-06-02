import { obstacleEncoder } from "../../shared/dataEncoders.js";
import type { PointedDataView } from "../../shared/encoder/types.js";
import type { VisionBounds } from "../../shared/visionBounds.js";
import type { Game } from "../game.js";
import { infSum, vectorMagnitudes } from "../sharedConstants.js";
import { Beetle } from "./beetle.js";
import { Particle } from "./particle.js";
import { Projectile } from "./projectile.js";
import { minRubyHp, type Ruby } from "./ruby.js";

export class Obstacle {
    isCircle: boolean;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    size: number;

    isAggressive: boolean;
    animation: number = 0;
    animationSpeed: number;
    rotationSpeed: number;

    id: number;
    game: Game;

    constructor(game: Game) {
        const [x, y] = game.getSpawnPointWithMargin(0);

        const isCircle = Math.random() < 0.5;
        let x1: number, y1: number, x2: number, y2: number, size: number;
        if (isCircle) {
            x1 = x;
            y1 = y;
            x2 = 0;
            y2 = 0;
            size = Math.random() * 2 + 2;
        } else {
            const ang = Math.random() * Math.PI * 2;
            const rr = Math.random() * 2.5 + 1.5;
            x1 = x - Math.cos(ang) * rr;
            y1 = y - Math.sin(ang) * rr;
            x2 = x + Math.cos(ang) * rr;
            y2 = y + Math.sin(ang) * rr;
            size = Math.random() * 0.3 + 0.5;
        }

        this.id = game.obstacleId.next();
        this.game = game;

        this.isCircle = isCircle;
        this.x1 = x1;
        this.y1 = y1;
        this.x2 = x2;
        this.y2 = y2;
        this.size = size;
        this.isAggressive = Math.random() < 0.5;
        this.animationSpeed = Math.pow(Math.random(), 1.5) * 0.1;
        this.rotationSpeed = Math.pow(Math.random(), 1.5) * 0.01 * (Math.random() < 0.5 ? 1 : -1);
    }

    update() {
        this.animation += this.animationSpeed;

        if (!this.isCircle) {
            const mx = (this.x1 - this.x2) * this.rotationSpeed;
            const my = (this.y1 - this.y2) * this.rotationSpeed;
            this.x1 -= my;
            this.y1 += mx;
            this.x2 += my;
            this.y2 -= mx;
        }
    }

    onDead() {
        this.game.obstacleId.unregister(this.id);
    }

    finishUpdate() {
        if (this.animation > 1) {
            this.animation--;
        }
    }

    getDistanceTo(x: number, y: number) {
        if (this.isCircle) {
            const dx = x - this.x1;
            const dy = y - this.y1;
            return Math.sqrt(dx * dx + dy * dy);
        } else {
            const vx = this.x2 - this.x1;
            const vy = this.y2 - this.y1;

            const lenSq = vx * vx + vy * vy;

            let t = ((x - this.x1) * vx + (y - this.y1) * vy) / lenSq;
            t = Math.max(0, Math.min(1, t));

            const closestX = this.x1 + vx * t;
            const closestY = this.y1 + vy * t;

            const dx = x - closestX;
            const dy = y - closestY;
            return Math.sqrt(dx * dx + dy * dy);
        }
    }

    pushAwayFrom(other: Obstacle) {
        if (other == this) return;

        const dx = this.x1 - other.x1;
        const dy = this.y1 - other.y1;
        const dsqr = dx * dx + dy * dy;
        this.x1 += dx / dsqr * 0.2;
        this.x2 += dx / dsqr * 0.2;
        this.y1 += dy / dsqr * 0.2;
        this.y2 += dy / dsqr * 0.2;
    }

    getSize() {
        return this.size + (this.isAggressive ? 0 : (1 - this.animation % 1) * 0.4);
    }

    handleCollision(other: Beetle | Ruby | Projectile) {
        const selfSize = this.getSize();
        const otherSize = other.size;
        const ds = otherSize + selfSize;

        if (this.isCircle) {
            const dx = other.x - this.x1;
            const dy = other.y - this.y1;
            if (dx * dx + dy * dy > ds * ds) return;

            const norm = Math.sqrt(dx * dx + dy * dy);
            const ndx = dx / norm;
            const ndy = dy / norm;
            this.resolveCollision(other, ndx, ndy, ds - norm);
        } else {
            const vx = this.x2 - this.x1;
            const vy = this.y2 - this.y1;

            const lenSq = vx * vx + vy * vy;

            let t = ((other.x - this.x1) * vx + (other.y - this.y1) * vy) / lenSq;
            t = Math.max(0, Math.min(1, t));

            const closestX = this.x1 + vx * t;
            const closestY = this.y1 + vy * t;

            const dx = other.x - closestX;
            const dy = other.y - closestY;

            if (dx * dx + dy * dy >= ds * ds) return;

            const norm = Math.sqrt(dx * dx + dy * dy);
            let ndx, ndy;

            if (norm < 1e-7) {
                const len = Math.hypot(vx, vy);
                ndx = -vy / len;
                ndy = vx / len;
            } else {
                ndx = dx / norm;
                ndy = dy / norm;
            }

            this.resolveCollision(other, ndx, ndy, ds - norm);
        }
    }

    resolveCollision(other: Beetle | Ruby | Projectile, ndx: number, ndy: number, dds: number) {
        if(other instanceof Projectile) {
            other.onCollisionWithObject();
            return;
        }

        if (this.isAggressive) {
            this.game.particles.push(new Particle(
                other.x - ndx * other.size,
                other.y - ndy * other.size,
                vectorMagnitudes.aggresiveObstacle.size * infSum,
                'nonRuby'
            ));
            this.applyCollisionVector(other, ndx, ndy, vectorMagnitudes.aggresiveObstacle);
        } else if (this.animation > 1) {
            this.applyCollisionVector(other, ndx, ndy, vectorMagnitudes.animatedObstacle);
        }
        
        other.x += ndx * dds;
        other.y += ndy * dds;
    }

    applyCollisionVector(other: Beetle | Ruby, ndx: number, ndy: number, vector: { size: number, position: number }) {
        other.vx = ndx * vector.position;
        other.vy = ndy * vector.position;
        if (other instanceof Beetle) {
            other.vsize += vector.size;
        } else if(this.isAggressive) {
            other.hp -= 0.2;
            if(other.hp < minRubyHp) {
                other.hp = -1;
            }
        }
    }
    
    
    filterMessage(bounds: VisionBounds): boolean {
        if(bounds.isInsideWithMargin(this.x1, this.y1, this.size + 2)) return true;
        if(!this.isCircle && bounds.isInsideWithMargin(this.x2, this.y2, this.size + 1)) return true;
        return false;
    }
    writeToBuffer(view: PointedDataView) {
        obstacleEncoder.writeToBuffer(view, {
            id: this.id,

            isCircle: this.isCircle,
            x1: this.x1,
            y1: this.y1,
            x2: this.x2,
            y2: this.y2,
            size: this.getSize(),

            isAggressive: this.isAggressive
        });
    }
}

const targetObstacleDensity = 0.0012;
export function spawnNewObstacles(game: Game) {
    const targetNumObstacles = targetObstacleDensity * Math.PI * game.mapSize * game.mapSize - 1;
    if (game.obstacles.size < targetNumObstacles) {
        const obstacle = new Obstacle(game);
        game.obstacles.set(obstacle.id, obstacle);
    }
}
