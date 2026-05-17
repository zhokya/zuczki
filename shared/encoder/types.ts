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
