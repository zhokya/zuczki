export class VisionBounds {
    minX: number;
    minY: number;
    maxX: number;
    maxY: number;

    constructor(minX: number, minY: number, maxX: number, maxY: number) {
        this.minX = minX;
        this.minY = minY;
        this.maxX = maxX;
        this.maxY = maxY;
    }

    isInside(x: number, y: number) {
        return this.minX <= x && x <= this.maxX && this.minY <= y && y <= this.maxY;
    }

    isInsideWithMargin(x: number, y: number, margin: number) {
        return this.minX - margin <= x && x <= this.maxX + margin && this.minY - margin <= y && y <= this.maxY + margin;
    }
}

export function getVisionBoundsFromCenter(centerX: number, centerY: number, w: number, h: number, scale: number) {
    return new VisionBounds(
        centerX - w / 2 / scale,
        centerY - h / 2 / scale,
        centerX + w / 2 / scale,
        centerY + h / 2 / scale,
    );
}
