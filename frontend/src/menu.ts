import { LocalBeetle } from "./entities/beetle";
import type { RenderInfo } from "./types";
import { isAlive } from "./mainCanvas";
import { VisionBounds } from "../../shared/visionBounds";
import { isLooks, numUsedColors, type Looks } from "../../shared/looks";
import { colors, getRandomLook } from "../../shared/looks";
import { send } from "./wsManager";
import { clientPlayEncoder, clientPlayId } from "../../shared/dataEncoders";
import { ParticleSystem } from "./visuals/particleSystem";

const c = document.getElementById('small-canvas') as HTMLCanvasElement;
const ctx = c.getContext('2d') as CanvasRenderingContext2D;

const w = c.width;
const h = c.height;

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

function initializeInputs() {
    antennaDotsElement.checked = chosenLooks.antennaDots;
    antennaSizeElement.value = chosenLooks.antennaSize.toString();
    updateBorders();
}
c.addEventListener('click', () => {
    c.className = 'choosingLooks';
    document.getElementById('menu-fade')?.setAttribute('style', 'opacity: 0.6');
    document.getElementById('not-looks')?.setAttribute('style', 'pointer-events: none; opacity: 0;');
    document.getElementById('looks')?.setAttribute('style', 'pointer-events: all; opacity: 1;');
    initializeInputs();
});

function saveToStorage() {
    localStorage.setItem('zuczki_looks', JSON.stringify(chosenLooks));
    localStorage.setItem('zuczki_randomize', randomize ? '1' : '0');
}
looksSave.addEventListener('click', () => {
    c.className = 'notChoosingLooks';
    document.getElementById('menu-fade')?.setAttribute('style', 'opacity: 0');
    document.getElementById('not-looks')?.setAttribute('style', 'pointer-events: all; opacity: 1;');
    document.getElementById('looks')?.setAttribute('style', 'pointer-events: none; opacity: 0;');
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

document.getElementById('play')?.addEventListener('click', () => {
    chosenLooks.nickname = nicknameElement.value;
    send(clientPlayId, { looks: chosenLooks, powerupType: 2 }, clientPlayEncoder);
});

export function onDead() {
    if (randomize) {
        chosenLooks = getRandomLook(chosenLooks.nickname);
        initializeInputs();
        saveToStorage();
    }
}

let prevT: number | null = null;
export let aliveT = 0;
const particleSystem = new ParticleSystem();
const menuBeetle = new LocalBeetle({
    x: w * 0.5,
    y: h * 0.64,
    size: w * 0.33,
    angle: -Math.PI / 2,
    targetAngle:  -Math.PI / 2,
    powerupTicks: 0,
    score: 0,
    globId: -1,
    powerupNumber: -1
});
export function menuRenderLoop(t: number) {
    requestAnimationFrame(menuRenderLoop);

    if (prevT === null) {
        prevT = t;
    }

    if (isAlive) {
        aliveT += t - prevT;
    } else {
        aliveT = 0;
    }
    if (aliveT < 1000) {
        ctx.clearRect(0, 0, w, h);

        const bounds = new VisionBounds(0, 0, w, h);
        const renderInfo: RenderInfo = { ctx, w, h, prevT, t, scale: 1, bounds, particleSystem, centerX: w / 2, centerY: h / 2 };
        menuBeetle.render(renderInfo, chosenLooks);
    }

    prevT = t;
}
