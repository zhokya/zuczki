export let quality: 0 | 1 | 2 = 2;

const storedQuality = localStorage.getItem('zuczki_quality');
if (storedQuality !== null) {
    const storedQualityNum = parseInt(storedQuality);
    if (storedQualityNum === 0 || storedQualityNum === 1 || storedQualityNum === 2) {
        quality = storedQualityNum;
    }
}

const buttonElement = document.getElementById('quality-button') as HTMLButtonElement;
const textElement = document.getElementById('quality-button-text') as HTMLDivElement;
const canvas = document.getElementById('quality-button-img') as HTMLCanvasElement;
const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;

const img = new Image();
img.src = '/icon-128-centered.png';

function drawIcon() {
    if (!img.complete) return;

    const sourceSize = [12, 22, 128][quality];

    ctx.clearRect(0, 0, 64, 64);
    ctx.imageSmoothingEnabled = false;

    const tmp = document.createElement('canvas');
    tmp.width = sourceSize;
    tmp.height = sourceSize;

    const tmpCtx = tmp.getContext('2d') as CanvasRenderingContext2D;
    tmpCtx.imageSmoothingEnabled = true;
    tmpCtx.drawImage(img, 0, 0, sourceSize, sourceSize);

    ctx.drawImage(tmp, 0, 0, 64, 64);
}

function update() {
    textElement.innerText = ['Low', 'Mid', 'High'][quality];
    localStorage.setItem('zuczki_quality', quality.toString());
    drawIcon();
}

img.onload = update;
update();

buttonElement.addEventListener('click', () => {
    quality = ((quality + 1) % 3) as 0 | 1 | 2;
    update();
});
