import { particleEncoder } from "../../shared/dataEncoders.js";
import type { PointedDataView } from "../../shared/encoder/types.js";
import type { VisionBounds } from "../../shared/visionBounds.js";

export class Particle {
    x; y;
    size;
    type;

    constructor(x: number, y: number, size: number, type: 'ruby' | 'rubyRemoval' | 'obstacle') {
        this.x = x;
        this.y = y;
        this.size = size;
        this.type = type;
    }


    filterMessage(bounds: VisionBounds): boolean {
        return bounds.isInsideWithMargin(this.x, this.y, 5);
    }
    writeToBuffer(view: PointedDataView) {
        particleEncoder.writeToBuffer(view, this);
    }
}
