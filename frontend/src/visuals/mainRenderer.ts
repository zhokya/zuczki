import type { Looks } from "../../../shared/looks";
import type { Beetle } from "../entities/beetle";
import type { Obstacle } from "../entities/obstacle";
import type { Point } from "../entities/point";
import type { Projectile } from "../entities/projectile";
import type { Ruby } from "../entities/ruby";
import type { RenderInfo } from "../types";
import { renderBeforeTransform, renderEnvironment, renderWorldEdge } from "./environment";
import { renderMinimap } from "./minimap";
import { renderSizeWarning } from "./sizeWarning";

interface Text {
    x: number;
    y: number;
    text: string;
}

export function render(
    renderInfo: RenderInfo, 
    selfBeetle: Beetle | undefined,
    looksMap: Map<number, Looks>,
    beetles: Map<number, Beetle>,
    rubys: Map<number, Ruby>,
    obstacles: Map<number, Obstacle>,
    projectiles: Map<number, Projectile>,
    points: Map<number, Point>,
) {
    const { ctx, scale, w, h, centerX, centerY, particleSystem } = renderInfo;

    renderBeforeTransform(renderInfo);

    ctx.save();
    ctx.translate(w / 2, h / 2);
    ctx.scale(scale, scale);
    ctx.translate(-centerX, -centerY);

    renderEnvironment(renderInfo);

    const texts: Text[] = [];
    const matrix = ctx.getTransform();

    [points, rubys, obstacles, projectiles].forEach(entityMap => {
        entityMap.forEach(entity => entity.render(renderInfo));
    });

    renderWorldEdge(renderInfo);

    beetles.forEach(b => {
        const look = looksMap.get(b.id);

        b.render(renderInfo, look);

        texts.push({
            x: Math.round(matrix.a * b.x.value + matrix.c * (b.y.value + b.size.value * 1.2) + matrix.e),
            y: Math.round(matrix.b * b.x.value + matrix.d * (b.y.value + b.size.value * 1.2) + matrix.f),
            text: (look === undefined || look.nickname === '' ? '' : look.nickname + ' ') + '(' + b.score + ')'
        });
    });

    rubys.forEach(r => r.renderHpBar(renderInfo));

    particleSystem.render(renderInfo);

    ctx.restore();

    ctx.fillStyle = 'black';
    ctx.font = '14px arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    texts.forEach(t => {
        ctx.fillText(t.text, t.x, t.y);
    });
    
    if (selfBeetle !== undefined) {
        renderMinimap(renderInfo, selfBeetle);
        renderSizeWarning(renderInfo, selfBeetle.size.value);
    }
}
