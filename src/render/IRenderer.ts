import type { Rgba } from '../config/palette';

export const SHAPE_RING = 0;
export const SHAPE_DISC = 1;
export const SHAPE_GLOW = 2;
export type ShapeKind = typeof SHAPE_RING | typeof SHAPE_DISC | typeof SHAPE_GLOW;

export interface DrawCommand {
  x: number;
  y: number;
  radius: number;
  thickness: number;
  softness: number;
  shape: ShapeKind;
  color: Rgba;
}

/** ISP: системам нужен только этот интерфейс, WebGL остаётся деталью реализации. */
export interface IRenderer {
  readonly width: number;
  readonly height: number;
  readonly pixelRatio: number;
  resize(): void;
  beginFrame(clear: Rgba): void;
  draw(command: DrawCommand): void;
  endFrame(): void;
  dispose(): void;
}
