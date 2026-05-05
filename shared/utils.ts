export function generateId(id_length: number): string {
    let res = '';
    for (let i = 0; i < id_length; i++) {
        res += String.fromCharCode(Math.floor(Math.random() * 26) + 97);
    }
    return res;
}

export function samplePointInCircle(radius: number): [number, number] {
    const theta = Math.random() * 2 * Math.PI;
    const r = radius * Math.max(Math.random(), Math.random());
    return [r * Math.cos(theta), r * Math.sin(theta)];
}

const pi2 = Math.PI * 2;

export function moduloAngle(angle: number) {
    return ((angle % pi2) + pi2) % pi2;
}

export function angleDifference(a1: number, a2: number) {
    a1 = moduloAngle(a1);
    a2 = moduloAngle(a2);
    return Math.min(
        Math.abs(a1 - a2 - pi2),
        Math.abs(a1 - a2),
        Math.abs(a1 - a2 + pi2)
    )
}

// returns true if adding to a1 will make it closer to a2, otherwise return false
// TODO: make it smarter
export function isPositiveRotationCloser(a1: number, a2: number): boolean {
    a1 = moduloAngle(a1);
    a2 = moduloAngle(a2);
    const h = 0.0001;
    return angleDifference(a1 + h, a2) < angleDifference(a1 - h, a2);
}

export function rotateAngleTowards(angle: number, targetAngle: number, delta: number) {
    angle = moduloAngle(angle);
    targetAngle = moduloAngle(targetAngle);

    if (angleDifference(angle, targetAngle) <= delta) return targetAngle;

    if (isPositiveRotationCloser(angle, targetAngle)) {
        return moduloAngle(angle + delta);
    } else {
        return moduloAngle(angle - delta);
    }
}

export function lerp(a: number, b: number, t: number) {
    return a + (b - a) * t;
}
export function lerpAngle(a1: number, a2: number, t: number) {
    const delta = angleDifference(a1, a2) * t;

    if (isPositiveRotationCloser(a1, a2)) {
        return moduloAngle(a1 + delta);
    } else {
        return moduloAngle(a2 - delta);
    }
}
export function expLerp(a: number, b: number, t: number, decay: number) {
    return b + (a - b) * Math.exp(-decay * t);
}
