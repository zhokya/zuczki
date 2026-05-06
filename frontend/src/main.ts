import { moduloAngle } from '../../shared';
import { isAlive, mainCanvasRenderLoop } from './mainCanvas';
import { chosenLooks, menuRenderLoop } from './menu';
import { rejoin, sendJson, sendUpdate } from './wsManager';

rejoin();

requestAnimationFrame(menuRenderLoop);
requestAnimationFrame(mainCanvasRenderLoop);

let targetAngle = Math.random() * Math.PI * 2;
let click = false;
window.addEventListener('mousemove', (ev) => {
    let x = ev.pageX - window.innerWidth / 2;
    let y = ev.pageY - window.innerHeight / 2;
    targetAngle = moduloAngle(Math.atan2(y, x));
});
window.addEventListener('click', () => {
    if(isAlive) {
        click = true;
    }
});

document.getElementById('play')?.addEventListener('click', () => {
    chosenLooks.nickname = (document.getElementById('nickname') as HTMLInputElement).value;
    sendJson({
        type: 'play',
        looks: chosenLooks
    });
});

setInterval(() => {
    sendUpdate(click ? 1 : 0, targetAngle);
    click = false;
}, 50);
