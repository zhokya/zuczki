import type { Looks } from "./types.ts";

export const colors = [
    "#f1615f",
    "#e84239",
    "#df1717",
    "#a01f1f",

    "#f87171",
    "#e07a7a",
    "#c95d5d",
    "#9f4646",

    "#f0ac3f",
    "#ff9800",
    "#f97316",
    "#ea580c",

    "#e0c86b",
    "#e39b6b",
    "#c97d49",
    "#a45f31",

    "#d5e72e",
    "#ddda10",
    "#cad436",
    "#9e8706",

    "#94c97b",
    "#72a85b",
    "#43a047",
    "#557f43",

    "#4ade80",
    "#22c55e",
    "#66bb6a",
    "#2e7d32",

    "#26a69a",
    "#0d9488",
    "#458379",
    "#00695c",

    "#7cc8ba",
    "#5ea99b",
    "#2dd4bf",
    "#14b8a6",

    "#38bdf8",
    "#0ea5e9",
    "#0284c7",
    "#156dc0",

    "#94abc5",
    "#7aa9e0",
    "#5d87c9",
    "#476aa3",

    "#818cf8",
    "#6366f1",
    "#4f46e5",
    "#251e9e",

    "#b08be0",
    "#7e57c2",
    "#5e35b1",
    "#4527a0",

    "#e879f9",
    "#d946ef",
    "#e43bbf",
    "#c026d3",

    "#d4b7ca",
    "#e08bc1",
    "#cf889f",
    "#a44f82",

    "#ec407a",
    "#e6197f",
    "#d81b60",
    "#ad1457",
];

export function getRandomLook(nickname: string | undefined): Looks {
    return {
        antennaDots: Math.random() < 0.5,
        antennaSize: Math.random() * 0.5,
        antennaColor: colors[Math.floor(Math.random() * colors.length)],
        mainColor: colors[Math.floor(Math.random() * colors.length)],
        insideColor: colors[Math.floor(Math.random() * colors.length)],
        nickname: nickname === undefined ? '' : nickname
    };
}
