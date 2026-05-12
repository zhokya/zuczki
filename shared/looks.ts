import type { Looks } from "./types.js";

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

function getRandomColor() {
    return colors[Math.floor(Math.random() * colors.length)];
}

export function getRandomLook(nickname: string): Looks {
    return {
        antennaDots: Math.random() < 0.5,
        antennaSize: Math.random() * 0.5,
        antennaColor: getRandomColor(),
        mainColor: getRandomColor(),
        insideColor: getRandomColor(),
        nickname: nickname
    };
}

export function normalizeLooks(looks: Looks) {
    looks.nickname = looks.nickname.split('\0').join('').split('\n').join('').slice(0, 18);
    looks.antennaSize = Math.max(0, Math.min(0.5, looks.antennaSize));
    if(!colors.includes(looks.mainColor)) {
        looks.mainColor = getRandomColor();
    }
    if(!colors.includes(looks.insideColor)) {
        looks.insideColor = getRandomColor();
    }
    if(!colors.includes(looks.antennaColor)) {
        looks.antennaColor = getRandomColor();
    }
}

export const randomNicknames = [
    'Anyomi', 'Bsosyo', 'Chugyj', 'Dhubyu', 'Emikya', 'Frutya', 'Gtomyg', 'Hrusya', 'Imuryx', 'Jwahya', 'Kratyw', 'Lyosya',
    'Mryate', 'Nmehyo', 'Osihyl', 'Pkepya', 'Ryazya', 'Spyose', 'Thahyu', 'Unogya', 'Wsyura', 'Ymumya', 'Zhyore',
    // 'Ayutya', 'Atapya', 'Atosyo', 'Akyahiki', 'Bsohabya', 'Bkakebyu', 'Bmyayeta', 'Bmikubys', 'Btayonya', 'Bsotagya', 
    // 'Csisagya', 'Cwoyezyo', 'Cryukonu', 'Dkehosyf', 'Dsipyana', 'Dtatoryu', 'Dwokyoro', 'Dsanimyo', 'Esyakyaa'

    'Akyoro', 'Bsyune', 'Cratyn', 'Dhyavo', 'Elyra', 'Fsyoko', 'Gryune', 'Hkaryo', 'Izyra',
    'Jsyeth', 'Kryavo', 'Lhyune', 'Msyaro', 'Nkyeth', 'Oryune', 'Psyavo', 'Qyreno', 'Rhyavo',
    'Sratyn', 'Tkyaro', 'Ulyeth', 'Vsyune', 'Wryavo', 'Xyreno', 'Ysyaro', 'Zkryen',

    'Avenyx', 'Brakalo', 'Cythera', 'Druvok', 'Elandir', 'Fexori', 'Garnyx', 'Hovira', 'Iskelo', 'Jandrix',
    'Kovari', 'Luneth', 'Morvax', 'Nysera', 'Orikesh', 'Paldro', 'Quenari', 'Rivox', 'Solari', 'Tenvyx',
    'Ulthra', 'Voreli', 'Wexari', 'Xandor', 'Ylmeri', 'Zorvyn'
];

export function getRandomNickname(): string {
    return randomNicknames[Math.floor(randomNicknames.length * Math.random())];
}
