import { UintEncoder } from "./numberEncoders.js";
import type { IFieldEncoder, PointedDataView } from "./types.js";

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder('utf-8', {
    fatal: true,
    ignoreBOM: false
});

export function utf8ByteLength(str: string) {
    let bytes = 0;

    for (const char of str) {
        const codePoint = char.codePointAt(0) as number;

        if (codePoint <= 0x7F) {
            bytes += 1;
        } else if (codePoint <= 0x7FF) {
            bytes += 2;
        } else if (codePoint <= 0xFFFF) {
            bytes += 3;
        } else {
            bytes += 4;
        }
    }

    return bytes;
}

export class StringEncoder implements IFieldEncoder<string> {
    bytes: number;
    bytesVariable = true;
    lengthEncoder: UintEncoder;

    constructor(lengthEncoderBits: 8 | 16 | 32) {
        this.lengthEncoder = new UintEncoder(lengthEncoderBits);
        this.bytes = this.lengthEncoder.bytes;
    }

    writeToBuffer(view: PointedDataView, value: string) {
        if(value == '') {
            this.lengthEncoder.writeToBuffer(view, 0);
            return;
        }

        const encoded = textEncoder.encode(value);
        if(encoded.length != utf8ByteLength(value)) {
            console.log('wtf???')
        }

        if (encoded.byteLength > this.lengthEncoder.maxValueInt) {
            throw new Error(
                `String exceeds maximum allowed byte length (${encoded.byteLength} > ${this.lengthEncoder.maxValueInt})`
            );
        }

        this.lengthEncoder.writeToBuffer(view, encoded.byteLength);

        const target = new Uint8Array(
            view.view.buffer,
            view.view.byteOffset + view.pointer,
            encoded.byteLength
        );

        target.set(encoded);
        view.pointer += encoded.byteLength;
    }

    readFromBuffer(view: PointedDataView): string {
        const byteLength = this.lengthEncoder.readFromBuffer(view);

        if(byteLength == 0) {
            return '';
        }

        const bytes = new Uint8Array(
            view.view.buffer,
            view.view.byteOffset + view.pointer,
            byteLength
        );

        view.pointer += byteLength;

        try {
            return textDecoder.decode(bytes);
        } catch {
            throw new Error('Invalid UTF-8 string data');
        }
    }
}
