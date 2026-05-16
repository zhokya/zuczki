import { Encoder, FieldEncoder } from "./encoder.js";

const idEncoder = new FieldEncoder("uint32");
const positionEncoder = new FieldEncoder("range16", -100, 100);
const angleEncoder = new FieldEncoder("range16", 0, Math.PI * 2);
const sizeEncoder = new FieldEncoder("range16", 0, 20);
const booleanEncoder = new FieldEncoder("uint8");

export const beetleEncoder = new Encoder({
    "globId": idEncoder,
    "x": positionEncoder,
    "y": positionEncoder,
    "angle": angleEncoder,
    "size": sizeEncoder,
    "score": new FieldEncoder("uint32"),
    "targetAngle": angleEncoder,
});

export const rubyEncoder = new Encoder({
    id: idEncoder,
    x: positionEncoder,
    y: positionEncoder,
    baseSize: sizeEncoder,
    hp: new FieldEncoder("range16", 0, 1),
    protection: new FieldEncoder("range16", 0, 1),
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
    numBeetles: new FieldEncoder("uint8"),
    numRubys: new FieldEncoder("uint8"),
    numObstacles: new FieldEncoder("uint8"),
    numPointCreations: new FieldEncoder("uint16"),
    numPointRemovals: new FieldEncoder("uint16"),
});

export const clientMessageEncoder = new Encoder({
    clickMode: new FieldEncoder("uint8"),
    targetAngle: angleEncoder
});

export type MessageBeetle = typeof beetleEncoder.type;
export type MessageRuby = typeof rubyEncoder.type;
export type MessageObstacle = typeof obstacleEncoder.type;
export type PointRemoval = typeof pointRemovalEncoder.type;
export type PointCreation = typeof pointCreationEncoder.type;
export type Header = typeof headerEncoder.type;
export type ClientMessage = typeof clientMessageEncoder.type;
