import { clientRegisterId, getClientRegisterEncoder } from "../../shared/dataEncoders";
import type { Encoder, EncoderSchema, EncoderType } from "../../shared/encoder/encoder";
import { getBufferVariableByteSize } from "../../shared/encoder/stringEncoder";
import { PointedDataView } from "../../shared/encoder/types";
import { generateId } from "../../shared/utils";

const idLength = parseInt(import.meta.env.VITE_ID_LENGTH);

function getBeetleId(): string {
    // TODO: uncomment to make automatic rejoining work

    const localStorageId = localStorage.getItem('zuczki_id');

    if (localStorageId !== null && localStorageId.length === idLength) {
        return localStorageId;
    }

    const newId = generateId(idLength);
    localStorage.setItem('zuczki_id', newId);
    return newId;
}

const beetleId = getBeetleId();

let globalWs: WebSocket | null = null;
let isFirstMessage = true;
let isRunning = false;
const jsonQueue: string[] = [];
const messageListeners: ((data: any, isFirstMessage: boolean) => void)[] = [];

export function rejoin() {
    globalWs = new WebSocket(import.meta.env.VITE_WEBSOCKET_PATH + window.location.pathname + window.location.search + window.location.hash);
    globalWs.binaryType = 'arraybuffer';
    isFirstMessage = true;

    globalWs.onopen = () => {
        if (globalWs === null) return;
        send(clientRegisterId, { id: beetleId }, getClientRegisterEncoder(idLength), false);
    };
    globalWs.onclose = () => {
        isRunning = false;
        if (globalWs !== null) {
            globalWs.close();
        }
        globalWs = null;
        setTimeout(rejoin, 500);
    };
    globalWs.onmessage = (ev) => {
        if (globalWs === null) return;
        isRunning = true;

        messageListeners.forEach(fn => {
            fn(ev.data, isFirstMessage);
        });
        isFirstMessage = false;

        const lastQueueElement = jsonQueue.pop();
        if (lastQueueElement !== undefined) {
            globalWs.send(lastQueueElement);
        }
    };
}

export function send<T extends EncoderSchema>(type: number, update: EncoderType<T>, encoder: Encoder<T>, mustBeRunning: boolean = true) {
    if (globalWs === null) return;
    if (!isRunning && mustBeRunning) return;

    const buffer = new ArrayBuffer(1 + encoder.bytes + getBufferVariableByteSize(update, encoder));
    const view = new PointedDataView(new DataView(buffer));

    view.view.setUint8(0, type);
    view.pointer++;
    encoder.writeToBuffer(view, update);

    globalWs.send(buffer);
}

export function onMessage(listener: (ev: any, isFirstMessage: boolean) => void) {
    messageListeners.push(listener);
}
