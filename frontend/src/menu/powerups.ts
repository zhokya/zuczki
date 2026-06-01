import { renderPowerupIcon } from "../visuals/powerupIcons";

const size = 36;

const savedPowerupNumber = localStorage.getItem('zuczki_powerup');
export let chosenPowerup = savedPowerupNumber === null || isNaN(parseInt(savedPowerupNumber)) ? 0 : parseInt(savedPowerupNumber);

const powerupIconsElement = document.getElementById('powerup-icons') as HTMLDivElement;
const powerupIcons: HTMLDivElement[] = [];
[0, 1, 2, 3].forEach(powerupNumber => {
    const child = document.createElement('div');

    const icon = document.createElement('canvas');
    renderPowerupIcon(powerupNumber, size, size, icon);

    child.className = 'powerupIcon';
    child.appendChild(icon);
    child.style = 'width:' + size + 'px;height:' + size + 'px;';

    child.addEventListener('click', () => {
        localStorage.setItem('zuczki_powerup', powerupNumber.toString());
        chosenPowerup = powerupNumber;
        updatePowerupButtons();
    });

    powerupIconsElement.appendChild(child);
    powerupIcons.push(child);
});

function updatePowerupButtons() {
    for(let i = 0; i < 4; i ++) {
        if(i == chosenPowerup) {
            powerupIcons[i].className = 'powerupIcon chosenPowerup';
        } else {
            powerupIcons[i].className = 'powerupIcon unchosenPowerup';
        }
    }
}

updatePowerupButtons();
