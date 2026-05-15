export const vectorDecay = 0.9;
export const infSum = 1 - vectorDecay;

/**
 * by dividing by the sum of infinite geometric series vectorDecay^0 + vectorDecay^1 + vectorDecay^2 + ...
 * we can express each magnitude as the total delta it will cause:
 */
export const vectorMagnitudes = {
    beetleCollision: { size: 0.5 * infSum, position: 6 * infSum },
    mapEdgeCollision: { size: 0.3 * infSum, position: 5 * infSum },
    click: { size: 0.1 * infSum, position: 9 * infSum },
    ruby: { size: -1.5 * infSum, position: 30 * infSum },  // scaled by fraction of hp taken
    aggresiveObstacle: { size: 0.2 * infSum, position: 4 * infSum },
    animatedObstacle: { size: 0, position: 12 * infSum },
};
