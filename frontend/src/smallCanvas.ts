import renderBeetle from "./renderBeetle";

const c = document.getElementById('s') as HTMLCanvasElement;
const ctx = c.getContext('2d') as CanvasRenderingContext2D;

const w = c.width;
const h = c.height;

let prevT: number | null = null;
export function smallCanvasRenderLoop(t: number) {
    requestAnimationFrame(smallCanvasRenderLoop);

    if(prevT === null) {
        prevT = t;
    }

    ctx.clearRect(0, 0, w, h);

    renderBeetle(
        t, prevT, ctx,
        w / 2, h / 2, -Math.PI / 2, -Math.PI / 2, w / 4,
        'red', 'blue', 'yellow', 0.3, true
    )

    prevT = t;
}
