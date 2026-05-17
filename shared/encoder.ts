export class PointedDataView {
    view: DataView;
    pointer: number = 0;

    constructor(dataView: DataView) {
        this.view = dataView;
    }
}

export interface IFieldEncoder<T> {
    bytes: number;
    bytesVariable: boolean;
    writeToBuffer(view: PointedDataView, value: T): void;
    readFromBuffer(view: PointedDataView): T;
}

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

    constructor(bits: 8 | 16 | 32, min: number = 0, max: number = 1) {
        super(bits);
        this.min = min;
        this.max = max;
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

export type EncoderSchema = Record<string, IFieldEncoder<any>>;

export type EncoderType<T extends EncoderSchema> = {
    [K in keyof T]: T[K] extends IFieldEncoder<infer V>
    ? V
    : never;
};

export class Encoder<T extends EncoderSchema> {
    prototype: T;
    bytes = 0;
    bytesVariable = false;

    sortedFields: [keyof T, T[keyof T]][] = [];

    declare type: EncoderType<T>;

    constructor(prototype: T) {
        this.prototype = prototype;

        for (const [fieldName, fieldEncoder] of Object.entries(prototype)) {
            this.bytes += fieldEncoder.bytes;
            fieldEncoder.bytesVariable ||= fieldEncoder.bytesVariable;

            this.sortedFields.push([
                fieldName as keyof T,
                fieldEncoder as T[keyof T]
            ]);
        }

        this.sortedFields.sort((a, b) => {
            const fieldA = a[0] as string;
            const fieldB = b[0] as string;
            if (fieldA < fieldB) return -1;
            if (fieldA > fieldB) return 1;
            return 0;
        });
    }

    writeToBuffer(view: PointedDataView, value: typeof this.type) {
        for (let i = 0; i < this.sortedFields.length; i++) {
            const [fieldName, fieldEncoder] = this.sortedFields[i];
            fieldEncoder.writeToBuffer(view, value[fieldName]);
        }
    }

    readFromBuffer(view: PointedDataView): typeof this.type {
        const result = {} as typeof this.type;
        for (let i = 0; i < this.sortedFields.length; i++) {
            const [fieldName, fieldEncoder] = this.sortedFields[i];
            result[fieldName] = fieldEncoder.readFromBuffer(view);
        }
        return result;
    }

    readListFromBuffer(view: PointedDataView, numElements: number): (typeof this.type)[] {
        const result: (typeof this.type)[] = [];
        for (let i = 0; i < numElements; i++) {
            result.push(this.readFromBuffer(view));
        }
        return result;
    }
}
