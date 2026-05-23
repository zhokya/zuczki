import { UintEncoder } from "./numberEncoders.js";
import type { IFieldEncoder, PointedDataView } from "./types.js";

export class EnumEncoder<T> implements IFieldEncoder<T> {
    options: T[];
    private inverseOptions: Map<T, number>;

    bits: 8 | 16 | 32;
    bytes: number;
    bytesVariable = false;
    
    private encoder: UintEncoder;

    constructor(options: T[]) {
        this.options = options;
        this.inverseOptions = new Map();
        for(let i = 0; i < this.options.length; i ++) {
            this.inverseOptions.set(options[i], i);
        }

        let bits: 8 | 16 | 32 = 8;
        while(options.length > (1 << bits)) {
            bits = (bits * 2) as (8 | 16 | 32);
        }
        this.bits = bits;
        this.bytes = Math.round(bits / 8);

        this.encoder = new UintEncoder(this.bits);
    }

    writeToBuffer(view: PointedDataView, value: T) {
        this.encoder.writeToBuffer(view, this.inverseOptions.get(value) as number);
    }

    readFromBuffer(view: PointedDataView): T {
        return this.options[Math.min(this.options.length - 1, this.encoder.readFromBuffer(view))];
    }
}
