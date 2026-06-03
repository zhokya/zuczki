import { send } from "../wsManager";
import { clientPlayEncoder, clientPlayId } from "../../../shared/dataEncoders";
import { chosenLooks, initializeInputs, onDead } from "./looks";
import { chosenPowerup } from "./powerups";

const mainCanvas = document.getElementById('main-canvas') as HTMLCanvasElement;
const smallCanvas = document.getElementById('small-canvas') as HTMLCanvasElement;
const gameInfoElement = document.getElementById('game-info') as HTMLElement;
const menu = document.getElementById('menu') as HTMLDivElement;
const menuFade = document.getElementById('menu-fade') as HTMLDivElement;
const notLooks = document.getElementById('not-looks') as HTMLDivElement;
const looksElement = document.getElementById('looks') as HTMLDivElement;

function openMenu() {
    smallCanvas.className = 'choosingLooks';
    menuFade.setAttribute('style', 'opacity: 0.6');
    notLooks.setAttribute('style', 'pointer-events: none; opacity: 0;');
    looksElement.setAttribute('style', 'pointer-events: all; opacity: 1;');
    initializeInputs();
}

export function closeMenu() {
    smallCanvas.className = 'notChoosingLooks';
    menuFade.setAttribute('style', 'opacity: 0');
    notLooks.setAttribute('style', 'pointer-events: all; opacity: 1;');
    looksElement.setAttribute('style', 'pointer-events: none; opacity: 0;');
}

export let isAlive = false;
export let aliveT = 0;
let prevDelayedIsAlive = false;
let unaliveStartT: number | null = -1e9;
let prevCanJoin = true;
export function updateIsAlive(newIsAlive: boolean, canJoin: boolean) {
    isAlive = newIsAlive;

    if(isAlive) {
        unaliveStartT = null;
    } else if(unaliveStartT === null) {
        unaliveStartT = performance.now();
    }

    const delayedIsAlive = unaliveStartT === null || performance.now() - unaliveStartT < 3000;

    if(delayedIsAlive !== prevDelayedIsAlive && !isAlive) {
        onDead();
    }

    if (delayedIsAlive !== prevDelayedIsAlive || canJoin !== prevCanJoin) {
        if (delayedIsAlive || !canJoin) {
            mainCanvas.style = 'filter: none; opacity: 1;';
            menu.style = 'opacity: 0; pointer-events: none;'
            gameInfoElement.style = 'opacity: 1;';
        } else {
            mainCanvas.style = 'filter: blur(8px); opacity: 0.5;';
            menu.style = 'opacity: 1; pointer-events: all;';
            gameInfoElement.style = 'opacity: 0;';
        }
    }

    prevCanJoin = canJoin;
    prevDelayedIsAlive = delayedIsAlive;
}
export function onRenderIsAlive(prevT: number, t: number) {
    if (isAlive) {
        aliveT += t - prevT;
    } else {
        aliveT = 0;
    }
}

smallCanvas.addEventListener('click', openMenu);

document.getElementById('play')?.addEventListener('click', () => {
    send(clientPlayId, { looks: chosenLooks, powerupType: chosenPowerup }, clientPlayEncoder);
});
