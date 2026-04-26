export function generateId(id_length: number): string {
    let res = '';
    for (let i = 0; i < id_length; i++) {
        res += String.fromCharCode(Math.floor(Math.random() * 26) + 97);
    }
    return res;
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

export function rotateAngleTowards(angle: number, targetAngle: number, delta: number) {
    angle = moduloAngle(angle);
    targetAngle = moduloAngle(targetAngle);

    if(angleDifference(angle, targetAngle) <= delta) return targetAngle;

    let a1 = moduloAngle(angle + delta);
    let a2 = moduloAngle(angle - delta);
    if(angleDifference(a1, targetAngle) < angleDifference(a2, targetAngle)) {
        return a1;
    } else {
        return a2;
    }
}
