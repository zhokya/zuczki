import { binarySearch } from "../shared/utils.js";

export const vectorDecay = 0.9;
export const infSum = -1 / Math.log(vectorDecay);

export const minSpeed = 0.35;
export const maxSpeed = 0.45;
export const clickSpeed = 0.42;

export const magnitude1 = 0.11;
export const magnitude2 = 0.0;

export function getAverageDashDuration(magnitude: number) {
    return Math.log(1 + magnitude / magnitude1) * infSum;
}
export function getAverageDashDistance(magnitude: number) {
    return magnitude * infSum;
}
export function getAverageDashSpeed(magnitude: number) {
    return magnitude / Math.log(1 + magnitude / magnitude1);
}

/**
 * by dividing by the sum of integral from 0 to infinity of vectorDecay^x dx
 * we can express each magnitude as the total delta it will cause:
 */
export const vectorMagnitudes = {
    beetleCollision: { size: 0.5 / infSum, position: 6 / infSum },
    mapEdgeCollision: { size: 0.3 / infSum, position: 5 / infSum },
    click: { size: 0.1 / infSum, position: binarySearch(getAverageDashSpeed, clickSpeed, 0, 1e6).x },
    ruby: { size: -1.5 / infSum, position: 30 / infSum },  // scaled by fraction of hp taken
    aggresiveObstacle: { size: 0.2 / infSum, position: 4 / infSum },
    animatedObstacle: { size: 0, position: 12 / infSum },
};
