import type { IFieldEncoder, PointedDataView } from "./types.js";

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
            this.bytesVariable ||= fieldEncoder.bytesVariable;

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
