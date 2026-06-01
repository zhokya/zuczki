import { send } from "../wsManager";
import { clientPlayEncoder, clientPlayId } from "../../../shared/dataEncoders";
import { chosenLooks, initializeInputs } from "./looks";
import { chosenPowerup } from "./powerups";

const smallCanvas = document.getElementById('small-canvas') as HTMLCanvasElement;

function openMenu() {
    smallCanvas.className = 'choosingLooks';
    document.getElementById('menu-fade')?.setAttribute('style', 'opacity: 0.6');
    document.getElementById('not-looks')?.setAttribute('style', 'pointer-events: none; opacity: 0;');
    document.getElementById('looks')?.setAttribute('style', 'pointer-events: all; opacity: 1;');
    initializeInputs();
}

export function closeMenu() {
    smallCanvas.className = 'notChoosingLooks';
    document.getElementById('menu-fade')?.setAttribute('style', 'opacity: 0');
    document.getElementById('not-looks')?.setAttribute('style', 'pointer-events: all; opacity: 1;');
    document.getElementById('looks')?.setAttribute('style', 'pointer-events: none; opacity: 0;');
}

smallCanvas.addEventListener('click', openMenu);

document.getElementById('play')?.addEventListener('click', () => {
    send(clientPlayId, { looks: chosenLooks, powerupType: chosenPowerup }, clientPlayEncoder);
});
