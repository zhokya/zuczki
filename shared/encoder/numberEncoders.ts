import type { IFieldEncoder, PointedDataView } from "./types.js";

export class IntEncoder implements IFieldEncoder<number> {
    bits: 8 | 16 | 32;
    bytes: number;
    bytesVariable = false;
    maxValue: number;
    maxValueInt: number;

    constructor(bits: 8 | 16 | 32) {
        this.bits = bits;
        this.bytes = Math.round(this.bits / 8);
        this.maxValue = (2 ** this.bits) - 1;
        this.maxValueInt = Math.round(this.maxValue);
    }

    writeToBuffer(view: PointedDataView, value: number) {
        if (this.bytes == 1) {
            view.view.setInt8(view.pointer, value);
        } else if (this.bytes == 2) {
            view.view.setInt16(view.pointer, value, false);
        } else {
            view.view.setInt32(view.pointer, value, false);
        }
        view.pointer += this.bytes;
    }

    readFromBuffer(view: PointedDataView): number {
        let value;
        if (this.bytes == 1) {
            value = view.view.getInt8(view.pointer);
        } else if (this.bytes == 2) {
            value = view.view.getInt16(view.pointer, false);
        } else {
            value = view.view.getInt32(view.pointer, false);
        }
        view.pointer += this.bytes;
        return value;
    }
}

export class UintEncoder implements IFieldEncoder<number> {
    bits: 8 | 16 | 32;
    bytes: number;
    bytesVariable = false;
    maxValue: number;
    maxValueInt: number;

    constructor(bits: 8 | 16 | 32) {
        this.bits = bits;
        this.bytes = Math.round(this.bits / 8);
        this.maxValue = (2 ** this.bits) - 1;
        this.maxValueInt = Math.round(this.maxValue);
    }

    writeToBuffer(view: PointedDataView, value: number) {
        if (this.bytes == 1) {
            view.view.setUint8(view.pointer, value);
        } else if (this.bytes == 2) {
            view.view.setUint16(view.pointer, value, false);
        } else {
            view.view.setUint32(view.pointer, value, false);
        }
        view.pointer += this.bytes;
    }

    readFromBuffer(view: PointedDataView): number {
        let value;
        if (this.bytes == 1) {
            value = view.view.getUint8(view.pointer);
        } else if (this.bytes == 2) {
            value = view.view.getUint16(view.pointer, false);
        } else {
            value = view.view.getUint32(view.pointer, false);
        }
        view.pointer += this.bytes;
        return value;
    }
}

export class FloatEncoder implements IFieldEncoder<number> {
    bits: 32 | 64;
    bytes: number;
    bytesVariable = false;

    constructor(bits: 32 | 64) {
        this.bits = bits;
        this.bytes = Math.round(this.bits / 8);
    }

    writeToBuffer(view: PointedDataView, value: number) {
        if (this.bytes == 4) {
            view.view.setFloat32(view.pointer, value, false);
        } else {
            view.view.setFloat64(view.pointer, value, false);
        }
        view.pointer += this.bytes;
    }

    readFromBuffer(view: PointedDataView): number {
        let value;
        if (this.bytes == 4) {
            value = view.view.getFloat32(view.pointer, false);
        } else {
            value = view.view.getFloat64(view.pointer, false);
        }
        view.pointer += this.bytes;
        return value;
    }
}

export class RangeEncoder extends UintEncoder {
    min: number;
    max: number;
    precision: number;

    constructor(bits: 8 | 16 | 32, min: number = 0, max: number = 1) {
        super(bits);
        this.min = min;
        this.max = max;
        this.precision = (this.max - this.min) / Math.pow(2, bits);
    }

    writeToBuffer(view: PointedDataView, value: number) {
        value = Math.round((value - this.min) / (this.max - this.min) * this.maxValue);
        if (value < 0) {
            value = 0;
        } else if (value > this.maxValueInt) {
            value = this.maxValueInt;
        }

        super.writeToBuffer(view, value);
    }

    readFromBuffer(view: PointedDataView): number {
        return super.readFromBuffer(view) / this.maxValue * (this.max - this.min) + this.min;
    }
}

export class BooleanEncoder implements IFieldEncoder<boolean> {
    bits = 8;
    bytes = 1;
    bytesVariable = false;

    writeToBuffer(view: PointedDataView, value: boolean) {
        view.view.setUint8(view.pointer, value ? 1 : 0);
        view.pointer++;
    }

    readFromBuffer(view: PointedDataView): boolean {
        const value = view.view.getUint8(view.pointer) != 0;
        view.pointer++;
        return value;
    }
}
