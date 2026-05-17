import { BooleanEncoder, Encoder, RangeEncoder, UintEncoder } from "./encoder.js";

const idEncoder = new UintEncoder(32);
const positionEncoder = new RangeEncoder(16, -100, 100);
const angleEncoder = new RangeEncoder(16, 0, Math.PI * 2);
const sizeEncoder = new RangeEncoder(16, 0, 20);
const booleanEncoder = new BooleanEncoder();

export const beetleEncoder = new Encoder({
    "globId": idEncoder,
    "x": positionEncoder,
    "y": positionEncoder,
    "angle": angleEncoder,
    "size": sizeEncoder,
    "score": new UintEncoder(32),
    "targetAngle": angleEncoder,
});

export const rubyEncoder = new Encoder({
    id: idEncoder,
    x: positionEncoder,
    y: positionEncoder,
    baseSize: sizeEncoder,
    hp: new RangeEncoder(16, 0, 1),
    protection: new RangeEncoder(16, 0, 1),
});

export const obstacleEncoder = new Encoder({
    id: idEncoder,

    isCircle: booleanEncoder,
    x1: positionEncoder,
    y1: positionEncoder,
    x2: positionEncoder,
    y2: positionEncoder,
    size: sizeEncoder,

    isAggressive: booleanEncoder,
});

export const pointCreationEncoder = new Encoder({
    id: idEncoder,
    x: positionEncoder,
    y: positionEncoder
});

export const pointRemovalEncoder = new Encoder({
    id: idEncoder,
    x: positionEncoder,
    y: positionEncoder,
});

export const headerEncoder = new Encoder({
    globId: idEncoder,
    numBeetles: new UintEncoder(8),
    numRubys: new UintEncoder(8),
    numObstacles: new UintEncoder(8),
    numPointCreations: new UintEncoder(16),
    numPointRemovals: new UintEncoder(16),
    numLooks: new UintEncoder(8),
});

export const clientMessageEncoder = new Encoder({
    clickMode: new UintEncoder(8),
    targetAngle: angleEncoder
});

export type MessageBeetle = typeof beetleEncoder.type;
export type MessageRuby = typeof rubyEncoder.type;
export type MessageObstacle = typeof obstacleEncoder.type;
export type PointRemoval = typeof pointRemovalEncoder.type;
export type PointCreation = typeof pointCreationEncoder.type;
export type Header = typeof headerEncoder.type;
export type ClientMessage = typeof clientMessageEncoder.type;
