import { particleEncoder } from "../../shared/dataEncoders.js";
import type { PointedDataView } from "../../shared/encoder/types.js";
import type { VisionBounds } from "../../shared/visionBounds.js";

export class Particle {
    x; y;
    size;
    type;
    excludeBeetleIds: number[] = [];
    includeBeetleId: null | number = null;

    constructor(
        x: number, y: number, size: number, type: 'ruby' | 'rubyRemoval' | 'nonRuby',
        excludeBeetleIds?: number[], includeBeetleId?: null | number
    ) {
        this.x = x;
        this.y = y;
        this.size = size;
        this.type = type;

        if (excludeBeetleIds !== undefined) this.excludeBeetleIds = excludeBeetleIds;
        if (includeBeetleId !== undefined) this.includeBeetleId = includeBeetleId;
    }


    filterMessage(bounds: VisionBounds, selfBeetleId: number): boolean {
        if (!bounds.isInsideWithMargin(this.x, this.y, 5)) return false;
        if (this.includeBeetleId !== null && selfBeetleId != this.includeBeetleId) return false;
        for (let i = 0; i < this.excludeBeetleIds.length; i++) {
            if (this.excludeBeetleIds[i] == selfBeetleId) return false;
        }
        return true;
    }
    writeToBuffer(view: PointedDataView) {
        particleEncoder.writeToBuffer(view, this);
    }
}
