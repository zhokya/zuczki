export interface MessageBeetle {
    x: number,
    y: number,
    angle: number,
    size: number,
    score: number,
    targetAngle: number,
    globId: string
}

export interface Looks {
    mainColor: string;
    insideColor: string;
    antennaColor: string;
    antennaSize: number;
    antennaDots: boolean;
    nickname: string;
}

export interface MessageRuby {
    id: number;
    x: number;
    y: number;
    baseSize: number;
    hp: number;
    protection: number;
}

export interface MessageObstacle {
    id: number;

    isCircle: boolean;
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    size: number;

    isAggressive: boolean;
}

export interface Message {
    looks?: { [k: string]: Looks },
    leaderboard?: [number, string, number, boolean][],
    beetles: MessageBeetle[],
    rubys: MessageRuby[],
    obstacles: MessageObstacle[],
    newPoints: [number, number, number][],
    removedPoints: [number, number, number][],
    globId: string
}

export function isLooks(obj: any): obj is Looks {
    return (
        typeof obj === "object" &&
        obj !== null &&
        typeof obj.mainColor === "string" &&
        typeof obj.insideColor === "string" &&
        typeof obj.antennaColor === "string" &&
        typeof obj.antennaSize === "number" &&
        typeof obj.antennaDots === "boolean" &&
        typeof obj.nickname === "string"
    );
}
