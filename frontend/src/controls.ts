import { clientUpdateEncoder, clientUpdateId } from "../../shared/dataEncoders";
import { moduloAngle } from "../../shared/utils";
import { isAlive } from "./menu/menu";
import { send } from "./wsManager";

let targetAngle = Math.random() * Math.PI * 2;
function updateAngle(clientX: number, clientY: number) {
    let x = clientX - window.innerWidth / 2;
    let y = clientY - window.innerHeight / 2;
    targetAngle = moduloAngle(Math.atan2(y, x));
}


// Mouse controls

let mousedown = false;
let mousedownT = 0;
let mouseup = false;
let click = false;
const clickDt = 200;

window.addEventListener('mousemove', (ev) => {
    updateAngle(ev.pageX, ev.pageY);
});

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


// Mobile controls

let touchStartT = 0;

let waitingSecondTap = false;
let firstTapEndT = 0;

let secondTouchActive = false;
let secondTouchHoldSent = false;

const doubleTapDt = 250;

window.addEventListener('touchstart', (ev) => {
    if (!isAlive) return;

    ev.preventDefault();

    const touch = ev.touches[0];
    updateAngle(touch.clientX, touch.clientY);

    const now = performance.now();

    if (
        waitingSecondTap &&
        now - firstTapEndT <= doubleTapDt
    ) {
        secondTouchActive = true;
        secondTouchHoldSent = false;
        touchStartT = now;
    }
}, { passive: false });

window.addEventListener('touchmove', (ev) => {
    if (!isAlive) return;

    ev.preventDefault();

    const touch = ev.touches[0];
    updateAngle(touch.clientX, touch.clientY);
}, { passive: false });

window.addEventListener('touchend', (ev) => {
    if (!isAlive) return;

    ev.preventDefault();

    const now = performance.now();

    if (secondTouchHoldSent) {
        mouseup = true;

        secondTouchHoldSent = false;
        secondTouchActive = false;
        waitingSecondTap = false;

        return;
    }

    if (secondTouchActive) {
        click = true;

        secondTouchActive = false;
        waitingSecondTap = false;

        return;
    }

    waitingSecondTap = true;
    firstTapEndT = now;

    setTimeout(() => {
        if (
            waitingSecondTap &&
            performance.now() - firstTapEndT >= doubleTapDt
        ) {
            waitingSecondTap = false;
        }
    }, doubleTapDt);

}, { passive: false });

window.addEventListener('contextmenu', (ev) => {
    ev.preventDefault();
});



function getClickMode() {
    if (mousedown) {
        const dt = performance.now() - mousedownT;
        if (dt > clickDt) {
            mousedown = false;
            return 2;
        }
    }

    if (
        secondTouchActive &&
        !secondTouchHoldSent
    ) {
        const dt = performance.now() - touchStartT;

        if (dt > clickDt) {
            secondTouchHoldSent = true;
            return 2;
        }
    }

    if (click) {
        click = false;
        return 1;
    }

    if (mouseup) {
        mouseup = false;
        return 3;
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
        send(clientUpdateId, { clickMode, targetAngle }, clientUpdateEncoder);
    }
}
