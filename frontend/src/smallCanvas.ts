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
        w * 0.5, h * 0.64, -Math.PI / 2, -Math.PI / 2, w * 0.33,
        '#da2345', 'blue', 'yellow', 0.3, true
    )

    prevT = t;
}
