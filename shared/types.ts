export interface Beetle {
    // state
    x: number;
    y: number;
    angle: number;
    size: number;
    score: number;
    vectors: { x: number, y: number, size: number }[]

    // decissions
    targetAngle: number;
    clicked: boolean;

    // other
    id: string;
    lastBrainActive: number;
}

export interface Looks {
    mainColor: string;
    insideColor: string;
    antennaColor: string;
    antennaSize: number;
    antennaDots: boolean;
    nickname: string;
}

export interface MessageBeetle {
    x: number,
    y: number,
    angle: number,
    size: number,
    score: number,
    targetAngle: number,
    globId: string,
    self: boolean
}

export interface Message {
    looks?: { [k: string]: Looks },
    beetles: MessageBeetle[]
}
