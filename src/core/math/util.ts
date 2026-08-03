export const clamp = (value: number, min: number, max: number): number =>
  value < min ? min : value > max ? max : value;

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const invLerp = (a: number, b: number, v: number): number => (b === a ? 0 : (v - a) / (b - a));

/** Плавное приближение, независимое от частоты кадров. */
export const damp = (a: number, b: number, lambda: number, dt: number): number =>
  lerp(a, b, 1 - Math.exp(-lambda * (dt / 1000)));

export const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);
