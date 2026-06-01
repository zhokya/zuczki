import { onMessage } from "../wsManager";

const fpsCounterElement = document.getElementById('fps-counter') as HTMLElement;

const allStats = true;

let totalRenderingTime = 0;
let maxRenderingTime = 0;
let totalFrames = 0;
let maxFrameDelay = 0;

let totalWebsocketBytesReceived = 0;
onMessage((data: ArrayBuffer) => {
    totalWebsocketBytesReceived += data.byteLength;
});

let prevUpdate = -1;
let prevTime = -1;

export function updateFpsCounter(frameStartTime: number) {
    const currentTime = performance.now();
    if (prevTime === -1) {
        prevTime = currentTime;
        prevUpdate = currentTime;
    }

    const renderingTime = currentTime - frameStartTime;
    totalRenderingTime += renderingTime;
    maxRenderingTime = Math.max(maxRenderingTime, renderingTime);
    maxFrameDelay = Math.max(maxFrameDelay, currentTime - prevTime);
    totalFrames++;

    const timeElapsed = currentTime - prevUpdate;
    if (timeElapsed > 2000) {
        prevUpdate = currentTime;

        const fps = totalFrames / (timeElapsed / 1000);
        const lowestFps = 1000 / maxFrameDelay;
        const avgMs = totalRenderingTime / totalFrames;
        const maxMs = maxRenderingTime;
        const kbps = (totalWebsocketBytesReceived / 1000) / (timeElapsed / 1000);

        if (allStats) {
            fpsCounterElement.innerText = Math.round(fps) + 'fps (' + Math.round(lowestFps) + 'fps lowest)\n' +
                avgMs.toFixed(2) + 'ms (' + maxMs.toFixed(2) + 'ms max)\n' + 
                kbps.toFixed(1) + 'kB/s';
        } else {
            fpsCounterElement.innerText = Math.round(fps) + 'fps';
        }

        totalRenderingTime = 0;
        maxRenderingTime = 0;
        totalFrames = 0;
        maxFrameDelay = 0;
        totalWebsocketBytesReceived = 0;
    }

    prevTime = currentTime;
}
