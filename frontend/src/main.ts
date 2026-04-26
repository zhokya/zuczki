import { mainCanvasRenderLoop } from './mainCanvas';
import { smallCanvasRenderLoop } from './smallCanvas';
import './style.css';
import { rejoin, sendUpdate } from './wsManager';

rejoin();

requestAnimationFrame(smallCanvasRenderLoop);
requestAnimationFrame(mainCanvasRenderLoop);

let targetAngle = 0;
let click = false;
window.addEventListener('mousemove', (ev) => {
    let x = ev.pageX - window.innerWidth / 2;
    let y = ev.pageY - window.innerHeight / 2;
    targetAngle = (Math.atan2(y, x) + Math.PI * 2) % (Math.PI * 2);
});
window.addEventListener('click', () => {
    click = true;
});

setInterval(() => {
    sendUpdate(click ? 1 : 0, targetAngle);
    click = false;
}, 50);
