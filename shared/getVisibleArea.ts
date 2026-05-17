const baseVisibleArea = 25;

// The visible area will have height of getVisibleArea() and width of getVisibleArea() * defaultAspect
export const defaultAspect = 16 / 9;

export function getVisibleArea(beetleSize: number | null) {
    if(beetleSize === null) return getVisibleArea(2);
    return Math.pow(beetleSize, 0.4) * baseVisibleArea;
}
