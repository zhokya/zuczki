export interface BotData {
    botType: number;
};

export interface Beetle {
    // state
    x: number;
    y: number;
    size: number;
    angle: number;

    vx: number;
    vy: number;
    vsize: number;

    score: number;
    irrelevants: {id: string, ticks: number}[];

    // decissions
    targetAngle: number;
    clicked: boolean;

    // other
    id: string;
    lastBrainActive: number;
    botData: BotData | null;
}

export interface Looks {
    mainColor: string;
    insideColor: string;
    antennaColor: string;
    antennaSize: number;
    antennaDots: boolean;
    nickname: string;
}

export interface Ruby {
    id: number,
    x: number;
    y: number;
    vx: number;
    vy: number;
    baseSize: number;
    hp: number;
    protectionTicks: number;
}

export interface MessageBeetle {
    x: number,
    y: number,
    angle: number,
    size: number,
    score: number,
    targetAngle: number,
    globId: string
}

export interface MessageRuby {
    id: number,
    x: number;
    y: number;
    baseSize: number;
    hp: number;
    protection: number;
}

export interface Message {
    looks?: { [k: string]: Looks },
    beetles: MessageBeetle[],
    rubys: MessageRuby[],
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
