export type Rgba = readonly [number, number, number, number];

const hex = (value: string, alpha = 1): Rgba => {
  const n = parseInt(value.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, alpha];
};

export const PALETTE = {
  ink: hex('#07070f'),
  pulse: hex('#6ee7ff'),
  ember: hex('#ffb454'),
  mint: hex('#7cf0b2'),
  rose: hex('#ff5c7a'),
  chalk: hex('#e8e6f0'),
  violet: hex('#9d7bff'),
} as const;

export const withAlpha = (color: Rgba, alpha: number): Rgba => [
  color[0],
  color[1],
  color[2],
  alpha,
];

export const mixColor = (a: Rgba, b: Rgba, t: number): Rgba => [
  a[0] + (b[0] - a[0]) * t,
  a[1] + (b[1] - a[1]) * t,
  a[2] + (b[2] - a[2]) * t,
  a[3] + (b[3] - a[3]) * t,
];
