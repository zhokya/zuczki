import { generateId } from "../../shared";

function getBeetleId(): string {
    // TODO: uncomment to make automatic rejoining work
    
    // const localStorageId = localStorage.getItem('zuczki_id');

    // if (localStorageId !== null && localStorageId.length === parseInt(import.meta.env.VITE_ID_LENGTH)) {
    //     return localStorageId;
    // }

    const newId = generateId(parseInt(import.meta.env.VITE_ID_LENGTH));
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
    globalWs = new WebSocket(import.meta.env.VITE_WEBSOCKET_PATH);
    isFirstMessage = true;
    globalWs.onopen = () => {
        if(globalWs === null) return;
        globalWs.send(JSON.stringify({
            type: 'register',
            id: beetleId
        }))
    };
    globalWs.onclose = () => {
        isRunning = false;
        if(globalWs !== null) {
            globalWs.close();
        }
        globalWs = null;
        setTimeout(rejoin, 500);
    };
    globalWs.onmessage = (ev) => {
        if(globalWs === null) return;
        isRunning = true;

        messageListeners.forEach(fn => {
            fn(ev.data, isFirstMessage);
        });
        isFirstMessage = false;

        const lastQueueElement = jsonQueue.pop();
        if(lastQueueElement !== undefined) {
            globalWs.send(lastQueueElement);
        }
    };
}

export function sendJson(json: any) {
    const msg = JSON.stringify(json);
    if(globalWs === null || !isRunning) {
        jsonQueue.push(msg);
    } else {
        globalWs.send(msg);
    }
}

export function sendUpdate(uint8: number, angle: number) {
    if(globalWs === null || !isRunning) return;

    const buffer = new ArrayBuffer(5);
    const view = new DataView(buffer);

    view.setUint8(0, uint8);
    view.setFloat32(1, angle, true);

    globalWs.send(buffer);
}

export function onMessage(listener: (ev: any, isFirstMessage: boolean) => void) {
    messageListeners.push(listener);
}
