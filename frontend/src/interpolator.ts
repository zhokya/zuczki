/*
I am making a websocket game. Say for simplicity, we just get a single variable 'x' from the server. The server is designed to return packets in constant intervals, but because of network problems etc there can be some variance and lags. Now, we would like to somehow interpolate it so it looks good on browser. It should be smooth but also linear, let there be no slows and speeds down unless network is really unstable.
I also want to be able to interpolate angles. Angles will always be in range 0 to 2*pi.
Design a javascript Interpolator class, make it simple but good, do things that are known to work well, you don't have to overcomplicate, that will: 
- `constructor(value: number, isAngle: boolean)` will initialize the Interpolator with initial value of `value`. When it comes to angles, make sure it works correctly when interpolating from ~2*pi to ~0 and vice-versa! Immediately initialize `this.value = value`
- `update(x: number): void` - this will be called when I get message from the server with new value
- `onRender(): void` - this gets called once inside requestAnimationFrame. It should update `this.value` to be the interpolated value which I will be able to use in other parts of requestAnimationFrame call.
Balance nice looks over faking and showing past, make it be look as well as possible when some network problems will happen. Let there be as few parameters that I need to tune as possible - compute average intervals and network instability over time dynamically. Use typescript.
*/

export class Interpolator {
    value: number;
    uninterpolatedValue: number;

    private readonly isAngle: boolean;
    private buffer: { value: number; time: number }[];
    private avgInterval: number;
    private avgJitter: number;
    private lastReceiveTime: number;
    private renderTime: number;
    private lastFrameTime: number;

    constructor(value: number, isAngle: boolean) {
        this.value = value;
        this.uninterpolatedValue = value;
        this.isAngle = isAngle;

        const now = performance.now();
        this.buffer = [{ value, time: now }];
        this.avgInterval = 100;   // sane initial guess; self-corrects after a few packets
        this.avgJitter = 20;
        this.lastReceiveTime = now;
        this.renderTime = now - this.bufferDelay();
        this.lastFrameTime = now;
    }

    update(x: number): void {
        this.uninterpolatedValue = x;

        const now = performance.now();
        const interval = now - this.lastReceiveTime;

        // Exponential moving averages — α=0.15 balances responsiveness vs. stability
        const α = 0.15;
        this.avgInterval += α * (interval - this.avgInterval);
        const jitter = Math.abs(interval - this.avgInterval);
        this.avgJitter += α * (jitter - this.avgJitter);

        this.lastReceiveTime = now;
        this.buffer.push({ value: x, time: now });

        // Keep at least one sample behind renderTime so interpolation always has a left anchor
        while (this.buffer.length > 2 && this.buffer[1].time < this.renderTime) {
            this.buffer.shift();
        }
    }

    onRender(): void {
        const now = performance.now();
        const dt = now - this.lastFrameTime;
        this.lastFrameTime = now;

        // Advance render clock at wall speed, then gently nudge toward the target lag.
        // Capping correction at 20 % of dt means at most a barely-perceptible ±20 % speed
        // change per frame, invisible to the eye but enough to track drifting network conditions.
        const target = now - this.bufferDelay();
        this.renderTime += dt;
        const diff = target - this.renderTime;
        this.renderTime += Math.sign(diff) * Math.min(Math.abs(diff), dt * 0.2);

        this.value = this.interpolateAt(this.renderTime);
    }

    // ─── private ───────────────────────────────────────────────────────────────

    private bufferDelay(): number {
        // 1 avg interval of safety + 2 σ of jitter absorbs ~95 % of variance
        return this.avgInterval + 2 * this.avgJitter;
    }

    private interpolateAt(t: number): number {
        const b = this.buffer;
        if (b.length === 1) return b[0].value;
        if (t <= b[0].time) return b[0].value;
        if (t >= b[b.length - 1].time) return b[b.length - 1].value;

        // Binary search for the bracketing pair
        let lo = 0, hi = b.length - 1;
        while (hi - lo > 1) {
            const mid = (lo + hi) >> 1;
            if (b[mid].time <= t) lo = mid; else hi = mid;
        }

        const alpha = (t - b[lo].time) / (b[hi].time - b[lo].time);
        return this.lerp(b[lo].value, b[hi].value, alpha);
    }

    private lerp(a: number, b: number, t: number): number {
        if (this.isAngle) {
            // Always take the shortest arc around the circle
            let d = b - a;
            if (d > Math.PI) d -= 2 * Math.PI;
            if (d < -Math.PI) d += 2 * Math.PI;
            return a + d * t;
        }
        return a + (b - a) * t;
    }
}