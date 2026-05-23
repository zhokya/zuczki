export class Particle {
    x; y;
    size;
    type;

    constructor(x: number, y: number, size: number, type: 'ruby' | 'rubyRemoval' | 'obstacle') {
        this.x = x;
        this.y = y;
        this.size = size;
        this.type = type;
    }
}
