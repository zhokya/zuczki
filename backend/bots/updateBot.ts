import type { Beetle } from "../entities/beetle.js";
import { Game } from "../game.js";

export function updateBot(game: Game, beetle: Beetle) {
    if (Math.random() < 0.005) {
        beetle.clicked = true;
    }

    let mx = 0;
    let my = 0;
    game.points.forEach(point => {
        const dx = point.x - beetle.x;
        const dy = point.y - beetle.y;
        const imp = (160 - (dx * dx + dy * dy)) / 160;
        if (imp > 0) {
            const norm = Math.sqrt(dx * dx + dy * dy);
            mx += dx * imp / norm;
            my += dy * imp / norm;
        }
    });

    game.rubys.forEach(ruby => {
        const dx = ruby.x - beetle.x;
        const dy = ruby.y - beetle.y;
        const imp = ruby.baseSize * 40 * (240 - (dx * dx + dy * dy)) / 240;
        if (imp > 0) {
            const norm = Math.sqrt(dx * dx + dy * dy);
            mx += dx * imp / norm;
            my += dy * imp / norm;
        }
    });

    beetle.targetAngle = Math.atan2(my, mx);
}
