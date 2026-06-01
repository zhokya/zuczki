import { isLooks, numUsedColors, type Looks } from "../../../shared/looks";
import { colors, getRandomLook } from "../../../shared/looks";
import { closeMenu } from "./menu";

export let chosenLooks: Looks = getRandomLook('');
try {
    const savedLooksString = localStorage.getItem('zuczki_looks');
    if (typeof (savedLooksString) === 'string') {
        let savedLooks = JSON.parse(savedLooksString);
        if (isLooks(savedLooks)) {
            chosenLooks = savedLooks;
        }
    }
} catch { }

const looksSave = document.getElementById('looks-save') as HTMLDivElement;
const looksRandom = document.getElementById('looks-random') as HTMLDivElement;

let randomize = localStorage.getItem('zuczki_randomize') !== '0';
function updateRandomizationButton() {
    looksRandom.style = 'background: ' + (randomize ? 'rgb(121, 228, 121)' : 'rgb(230, 115, 80)');
}
updateRandomizationButton();

const antennaDotsElement = document.getElementById("looks-antennaDots") as HTMLInputElement;
const antennaSizeElement = document.getElementById("looks-antennaSize") as HTMLInputElement;
antennaDotsElement.addEventListener('change', () => {
    chosenLooks.antennaDots = antennaDotsElement.checked;
    randomize = false;
    updateRandomizationButton();
});
antennaSizeElement.addEventListener("input", () => {
    chosenLooks.antennaSize = +antennaSizeElement.value;
    randomize = false;
    updateRandomizationButton();
});

type ColorProperty = 'antennaColor' | 'mainColor' | 'insideColor';
const colorProperties: ColorProperty[] = ['antennaColor', 'mainColor', 'insideColor'];
const elements: Record<ColorProperty, HTMLDivElement[]> = { antennaColor: [], mainColor: [], insideColor: [] };
function updateBorders() {
    colorProperties.forEach(property => {
        elements[property].forEach((other, idx) => {
            if (idx === chosenLooks[property]) {
                other.style = 'transform: scale(1.2); background: ' + colors[idx];
            } else {
                other.style = 'background: ' + colors[idx];
            }
        });
    });
}
colorProperties.forEach(property => {
    const container = document.getElementById('looks-' + property) as HTMLDivElement;
    const elementsHere: HTMLDivElement[] = [];
    colors.forEach((_hex, idx) => {
        if(idx >= numUsedColors) return;
        const element = document.createElement('div');
        elementsHere.push(element);
        element.className = 'color-option';
        element.addEventListener('click', () => {
            chosenLooks[property] = idx;
            updateBorders();
            randomize = false;
            updateRandomizationButton();
        });
        container.appendChild(element);
    });
    elements[property] = elementsHere;
});
updateBorders();

export function initializeInputs() {
    antennaDotsElement.checked = chosenLooks.antennaDots;
    antennaSizeElement.value = chosenLooks.antennaSize.toString();
    updateBorders();
}

function saveToStorage() {
    localStorage.setItem('zuczki_looks', JSON.stringify(chosenLooks));
    localStorage.setItem('zuczki_randomize', randomize ? '1' : '0');
}
looksSave.addEventListener('click', () => {
    closeMenu();
    saveToStorage();
});
looksRandom.addEventListener('click', () => {
    randomize = true;
    if (randomize) {
        chosenLooks = getRandomLook(chosenLooks.nickname);
        initializeInputs();
    }
    updateRandomizationButton();
});
saveToStorage();

const nicknameElement = document.getElementById('nickname') as HTMLInputElement;
nicknameElement.value = chosenLooks.nickname;
nicknameElement.addEventListener('input', () => {
    chosenLooks.nickname = nicknameElement.value;
    saveToStorage();
});

export function onDead() {
    if (randomize) {
        chosenLooks = getRandomLook(chosenLooks.nickname);
        initializeInputs();
        saveToStorage();
    }
}
