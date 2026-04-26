export function generateId(id_length: number): string {
    let res = '';
    for (let i = 0; i < id_length; i++) {
        res += String.fromCharCode(Math.floor(Math.random() * 26) + 97);
    }
    return res;
}
