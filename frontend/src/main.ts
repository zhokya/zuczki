import { moduloAngle } from '../../shared';
import { mainCanvasRenderLoop } from './mainCanvas';
import { smallCanvasRenderLoop } from './smallCanvas';
import { rejoin, sendJson, sendUpdate } from './wsManager';

rejoin();

requestAnimationFrame(smallCanvasRenderLoop);
requestAnimationFrame(mainCanvasRenderLoop);

let targetAngle = 0;
let click = false;
window.addEventListener('mousemove', (ev) => {
    let x = ev.pageX - window.innerWidth / 2;
    let y = ev.pageY - window.innerHeight / 2;
    targetAngle = moduloAngle(Math.atan2(y, x));
});
window.addEventListener('click', () => {
    click = true;
});

document.getElementById('play')?.addEventListener('click', () => {
    sendJson({
        type: 'play',
        looks: {
            mainColor: '#4398bd',
            insideColor: '#5330b1',
            antennaColor: '#c25b97',
            antennaSize: 0.5,
            antennaDots: true,
            nickname: (document.getElementById('nickname') as HTMLInputElement).value
        }
    });
});

setInterval(() => {
    sendUpdate(click ? 1 : 0, targetAngle);
    click = false;
}, 50);
