export interface Looks {
    mainColor: string;
    insideColor: string;
    antennaColor: string;
    antennaSize: number;
    antennaDots: boolean;
    nickname: string;
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
