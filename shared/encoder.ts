export class PointedDataView {
    view: DataView;
    pointer: number = 0;

    constructor(dataView: DataView) {
        this.view = dataView;
    }
}

export type FieldEncoderTypes =
    "int64" | "uint64" | "float64" | "range64" |
    "int32" | "uint32" | "float32" | "range32" |
    "int16" | "uint16" | "float16" | "range16" |
    "int8" | "uint8" | "range8";
export class FieldEncoder {
    type: FieldEncoderTypes;
    min: number = 0;
    max: number = 1;

    subtype: 'i' | 'u' | 'f' | 'r';
    bits: number;
    bytes: number;
    setFn: string;
    getFn: string;
    maxValue: number;
    maxValueInt: number;

    constructor(type: FieldEncoderTypes, min?: number, max?: number) {
        this.type = type;

        this.subtype = type[0] as 'i' | 'u' | 'f' | 'r';
        this.bits = this.type.includes("32") ? 32 : (this.type.includes("16") ? 16 : 8);
        this.bytes = Math.round(this.bits / 8);

        const isBig = (this.subtype == 'i' || this.subtype == 'u') && this.bits == 64;
        const fnName = (isBig ? 'Big' : '') + { 'i': 'Int', 'u': 'Uint', 'f': 'Float', 'r': 'Uint' }[this.subtype] + this.bits;
        this.setFn = 'set' + fnName;
        this.getFn = 'get' + fnName;

        this.maxValue = (2 ** this.bits) - 1;
        this.maxValueInt = Math.round(this.maxValue);

        if (min !== undefined) {
            this.min = min;
        }
        if (max !== undefined) {
            this.max = max;
        }
    }

    writeToBuffer(view: PointedDataView, value: number) {
        if (this.subtype == 'r') {
            value = Math.round((value - this.min) / (this.max - this.min) * this.maxValue);
            if (value < 0) {
                value = 0;
            } else if (value > this.maxValueInt) {
                value = this.maxValueInt;
            }
        }
        // @ts-ignore
        view.view[this.setFn](view.pointer, value, true);
        view.pointer += this.bytes;
    }

    readFromBuffer(view: PointedDataView): number {
        // @ts-ignore
        let value = view.view[this.getFn](view.pointer, true);
        view.pointer += this.bytes;
        if (this.subtype == 'r') {
            value = value / this.maxValue * (this.max - this.min) + this.min;
        }
        return value;
    }
}

export class Encoder<T extends Record<string, FieldEncoder>> {
    prototype: T;
    bytes: number = 0;
    sortedFields: [keyof T, FieldEncoder][] = [];

    declare type: { [K in keyof T]: number };

    constructor(prototype: T) {
        this.prototype = prototype;

        for (const [fieldName, fieldEncoder] of Object.entries(prototype)) {
            this.bytes += fieldEncoder.bytes;
            this.sortedFields.push([fieldName, fieldEncoder]);
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
