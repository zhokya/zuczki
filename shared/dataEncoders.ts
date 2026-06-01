import { Encoder } from "./encoder/encoder.js";
import { EnumEncoder } from "./encoder/enumEncoder.js";
import { BooleanEncoder, RangeEncoder, UintEncoder } from "./encoder/numberEncoders.js";
import { ConstantLengthAsciiEncoder } from "./encoder/stringEncoder.js";
import { looksEncoder } from "./looks.js";

const positionEncoder = new RangeEncoder(16, -100, 100);
const angleEncoder = new RangeEncoder(16, 0, Math.PI * 2);
const sizeEncoder = new RangeEncoder(16, 0, 20);
const booleanEncoder = new BooleanEncoder();
const scoreEncoder = new UintEncoder(32);

export const beetleEncoder = new Encoder({
    id: new UintEncoder(8),
    x: positionEncoder,
    y: positionEncoder,
    angle: angleEncoder,
    size: sizeEncoder,
    score: scoreEncoder,
    targetAngle: angleEncoder,
    powerupNumber: new UintEncoder(8),
    powerupTicks: new UintEncoder(8)
});

export const rubyEncoder = new Encoder({
    id: new UintEncoder(16),
    x: positionEncoder,
    y: positionEncoder,
    baseSize: sizeEncoder,
    hp: new RangeEncoder(8, 0, 1),
    protection: new RangeEncoder(8, 0, 1),
});

export const obstacleEncoder = new Encoder({
    id: new UintEncoder(8),

    isCircle: booleanEncoder,
    x1: positionEncoder,
    y1: positionEncoder,
    x2: positionEncoder,
    y2: positionEncoder,
    size: sizeEncoder,

    isAggressive: booleanEncoder,
});

export const projectileEncoder = new Encoder({
    id: new UintEncoder(16),
    x: positionEncoder,
    y: positionEncoder
});

export const pointCreationEncoder = new Encoder({
    id: new UintEncoder(16),
    x: positionEncoder,
    y: positionEncoder
});

export const pointRemovalEncoder = new Encoder({
    id: new UintEncoder(16),
    x: positionEncoder,
    y: positionEncoder,
});

export const particleEncoder = new Encoder({
    type: new EnumEncoder(['ruby', 'rubyRemoval', 'nonRuby', 'death'] as const),
    size: new RangeEncoder(16, -20, 20),
    x: positionEncoder,
    y: positionEncoder,
});

export const leaderboardEntryEncoder = new Encoder({
    place: new UintEncoder(8),
    score: scoreEncoder,
    globId: new UintEncoder(8)
});

export const headerEncoder = new Encoder({
    globId: new UintEncoder(8),
    motionBlur: new UintEncoder(8),
    cameraX: positionEncoder,
    cameraY: positionEncoder,
    mapSize: new RangeEncoder(16, 0, 100),
    canJoin: booleanEncoder,
    
    numBeetles: new UintEncoder(8),
    numRubys: new UintEncoder(16),
    numObstacles: new UintEncoder(8),
    numProjectiles: new UintEncoder(16),
    numParticles: new UintEncoder(8),
    numPointCreations: new UintEncoder(16),
    numPointRemovals: new UintEncoder(16),
    numLooks: new UintEncoder(8),
    numLeaderboardEntries: new UintEncoder(8),
});

// Needs to be a function, because we need to read idLength from env, which is different for frontend and backend
export function getClientRegisterEncoder(idLength: number) {
    return new Encoder({
        id: new ConstantLengthAsciiEncoder(idLength)
    });
}
export const clientPlayEncoder = new Encoder({
    looks: looksEncoder,
    powerupType: new UintEncoder(8)
});
export const clientUpdateEncoder = new Encoder({
    clickMode: new UintEncoder(8),
    targetAngle: angleEncoder
});
export const clientRegisterId = 67;
export const clientPlayId = 68;
export const clientUpdateId = 69;

export type MessageBeetle = typeof beetleEncoder.type;
export type MessageRuby = typeof rubyEncoder.type;
export type MessageObstacle = typeof obstacleEncoder.type;
export type MessageProjectile = typeof projectileEncoder.type;
export type PointCreation = typeof pointCreationEncoder.type;
export type PointRemoval = typeof pointRemovalEncoder.type;
export type LeaderboardEntry = typeof leaderboardEntryEncoder.type;
export type Header = typeof headerEncoder.type;
