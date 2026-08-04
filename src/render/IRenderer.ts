import type { Rgba } from '../config/palette';

export const SHAPE_RING = 0;
export const SHAPE_DISC = 1;
export const SHAPE_GLOW = 2;
export const SHAPE_ARC = 3;
/** A rotated rectangular bar used by crosshair, rails and HUD decorations. */
export const SHAPE_BAR = 4;
/** Radial tick marks distributed around a circle — instrument dials. */
export const SHAPE_TICKS = 5;
/** Dashed ring: `count` dashes, `param` = duty cycle 0..1. */
export const SHAPE_DASH = 6;
/** Filled angular slice with a radial depth — light beams and panel sectors. */
export const SHAPE_WEDGE = 7;
/** Radar sweep: bright leading edge with a fading angular tail. */
export const SHAPE_SWEEP = 8;
/** Symmetric audio waveform strip along the local X axis. */
export const SHAPE_WAVE = 9;

export type ShapeKind =
  | typeof SHAPE_RING
  | typeof SHAPE_DISC
  | typeof SHAPE_GLOW
  | typeof SHAPE_ARC
  | typeof SHAPE_BAR
  | typeof SHAPE_TICKS
  | typeof SHAPE_DASH
  | typeof SHAPE_WEDGE
  | typeof SHAPE_SWEEP
  | typeof SHAPE_WAVE;

export interface DrawCommand {
  x: number;
  y: number;
  radius: number;
  thickness: number;
  softness: number;
  shape: ShapeKind;
  color: Rgba;
  rotation?: number;
  arc?: number;
  /**
   * Сила неонового ореола вокруг штриха: 0 — плоская фигура,
   * 1..2.5 — характерное свечение из референсов (ядро выбеливается).
   */
  glow?: number;
  /** TICKS/DASH: количество элементов. */
  count?: number;
  /** TICKS: ширина штриха в px. DASH: скважность 0..1. WAVE: частота. GLOW: степень затухания. */
  param?: number;
  /** WEDGE: мягкость угловых краёв. WAVE: фаза. */
  param2?: number;
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
