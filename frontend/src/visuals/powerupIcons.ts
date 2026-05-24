function renderIcon0(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#ddce8b4d';
    ctx.fillRect(0, 0, 1, 1);
    ctx.fillStyle = ctx.strokeStyle = '#bd5c0d';
    
    ctx.translate(0.5, 0.5);
    ctx.scale(0.5, 0.5);

    ctx.beginPath();
    ctx.arc(0, 0.275, 0.6, -Math.PI * 1.5 + 0.33, Math.PI * 0.5 - 0.33);
    ctx.lineTo(0.08, 0.675);
    ctx.lineTo(-0.08, 0.675);
    ctx.fill();


    ctx.lineWidth = 0.16;
    ctx.lineCap = 'round';

    ctx.beginPath();
    ctx.moveTo(0, -0.95);
    ctx.lineTo(0.3, -0.65);
    ctx.lineTo(-0.3, -0.65);
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(0, -0.75);
    ctx.lineTo(0.3, -0.45);
    ctx.lineTo(-0.3, -0.45);
    ctx.fill();
}

function renderIcon1(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#e7254518';
    ctx.fillRect(0, 0, 1, 1);
    ctx.fillStyle = ctx.strokeStyle = '#8d0d0d';
    
    ctx.translate(0.5, 0.5);
    ctx.scale(0.5, 0.5);

    ctx.beginPath();
    ctx.arc(0, 0, 0.6, -Math.PI * 1.5 + 0.12, Math.PI * 0.5 - 0.12);
    ctx.lineTo(0.08, 0.5);
    ctx.lineTo(-0.08, 0.5);
    ctx.fill();

    ctx.lineWidth = 0.2;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(-0.4, 0.8);
    ctx.lineTo(0.4, 0.8);
    ctx.stroke();
}

function renderIcon2(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#a7f5f84d';
    ctx.fillRect(0, 0, 1, 1);
    ctx.fillStyle = ctx.strokeStyle = '#07595f';

    ctx.translate(0.5, 0.5);
    ctx.scale(0.5, 0.5);

    ctx.beginPath();
    ctx.arc(0, 0.275, 0.6, -Math.PI * 1.5 + 0.33, Math.PI * 0.5 - 0.33);
    ctx.lineTo(0.08, 0.675);
    ctx.lineTo(-0.08, 0.675);
    ctx.fill();


    ctx.lineWidth = 0.08;
    ctx.lineCap = 'round';

    for(let i = 0; i < 4; i ++) {
        const ang = Math.PI * 2 / 8 * i;
        ctx.beginPath();
        ctx.moveTo(Math.cos(ang) * 0.3, -0.65 + Math.sin(ang) * 0.25);
        ctx.lineTo(-Math.cos(ang) * 0.3, -0.65 - Math.sin(ang) * 0.25);
        ctx.stroke();
    }
}

function renderIcon3(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = '#a5dd8b4d';
    ctx.fillRect(0, 0, 1, 1);
    ctx.fillStyle = ctx.strokeStyle = '#217011';
    
    ctx.translate(0.5, 0.6);
    ctx.scale(0.5, 0.5);

    ctx.beginPath();
    ctx.arc(0, 0, 0.6, -Math.PI * 1.5 + 0.33, Math.PI * 0.5 - 0.33);
    ctx.lineTo(0.08, 0.4);
    ctx.lineTo(-0.08, 0.4);
    ctx.fill();


    ctx.rotate(-Math.PI / 2 + 0.85);
    for(let i = 0; i < 2; i ++) {
        ctx.lineWidth = 0.16;
        ctx.lineCap = 'round';
        
        ctx.beginPath();
        ctx.arc(0, 0, 0.9, -0.65, 0);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0.6, 0);
        ctx.lineTo(0.9, 0.4);
        ctx.lineTo(1.2, 0);
        ctx.fill();
        ctx.rotate(Math.PI / 2 - 0.85);
        ctx.scale(-1, 1);
        ctx.rotate(-Math.PI / 2 + 0.85);
    }
}

export function renderPowerupIcon(number: number, w: number, h: number, canvas: HTMLCanvasElement) {
    canvas.width = w;
    canvas.height = h;
    
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    ctx.scale(w, h);

    if(number == 0) {
        renderIcon0(ctx);
    } else if(number == 1) {
        renderIcon1(ctx);
    } else if(number == 2) {
        renderIcon2(ctx);
    } else {
        renderIcon3(ctx);
    }
}
