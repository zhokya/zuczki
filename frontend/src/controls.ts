import { moduloAngle } from "../../shared/utils";
import { sendUpdate } from "./wsManager";
import { isAlive } from "./mainCanvas";

let targetAngle = Math.random() * Math.PI * 2;
window.addEventListener('mousemove', (ev) => {
    let x = ev.pageX - window.innerWidth / 2;
    let y = ev.pageY - window.innerHeight / 2;
    targetAngle = moduloAngle(Math.atan2(y, x));
});

let mousedown = false;
let mousedownT = 0;
let mouseup = false;
let click = false;
const clickDt = 200;
window.addEventListener('mousedown', () => {
    if (isAlive) {
        mousedown = true;
        mousedownT = performance.now();
    }
});
window.addEventListener('mouseup', () => {
    if (isAlive) {
        if (mousedown) {
            const dt = performance.now() - mousedownT;
            if (dt <= clickDt) {
                mousedown = false;
                click = true;
                return;
            }
        }
        mouseup = true;
    }
});

function getClickMode() {
    if (click) {
        click = false;
        return 1;
    } else {
        if (mouseup) {
            mouseup = false;
            return 3;
        } else if (mousedown) {
            const dt = performance.now() - mousedownT;
            if (dt > clickDt) {
                mousedown = false;
                return 2;
            }
        }
    }
    return 0;
}

let prevTargetAngle = -1;
let lastSendT = -1;
export function updateSendingLoop() {
    requestAnimationFrame(updateSendingLoop);

    if (!isAlive) return;

    const clickMode = getClickMode();
    if (clickMode != 0 || prevTargetAngle != targetAngle || performance.now() - lastSendT > 1000) {
        prevTargetAngle = targetAngle;
        lastSendT = performance.now();
        sendUpdate({ clickMode, targetAngle });
    }
}
