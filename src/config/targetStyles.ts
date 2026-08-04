import {
  SHAPE_ARC, SHAPE_BAR, SHAPE_DASH, SHAPE_DISC, SHAPE_GLOW, SHAPE_RING, SHAPE_TICKS, type ShapeKind,
} from '../render/IRenderer';
import type { TargetId, ToneId } from './visualThemes';

const TAU = Math.PI * 2;

/** Украшение мишени. Все радиусы — в долях LAYOUT.targetRadius. */
export interface TargetDeco {
  readonly shape: ShapeKind;
  readonly tone: ToneId;
  readonly r: number;
  readonly t?: number;
  readonly alpha: number;
  readonly glow?: number;
  readonly arc?: number;
  readonly count?: number;
  readonly p1?: number;
  readonly rot?: number;
  readonly spin?: number;
  readonly breathe?: number;
  readonly bspeed?: number;
  /** Реакция радиуса и альфы на попадание. */
  readonly kick?: number;
  readonly kickAlpha?: number;
  /** Смещение по орбите вокруг центра мишени. */
  readonly orbit?: number;
  readonly orbitSpeed?: number;
  /** Разворачивать элемент по касательной к орбите (для штрихов-стрелок). */
  readonly align?: boolean;
  /** Элемент едет вместе с блуждающим ядром. */
  readonly follow?: boolean;
  readonly pulse?: number;
  readonly pspeed?: number;
  readonly layer: number;
  readonly repeat?: number;
  readonly drot?: number;
  readonly dphase?: number;
}

export interface TargetStyle {
  /** Толщина основного кольца в долях LAYOUT.targetThickness. */
  readonly ringThickness: number;
  readonly ringAlpha: number;
  readonly ringGlow: number;
  /** Амплитуда блуждания ядра в долях targetRadius. */
  readonly wander: number;
  readonly decorations: readonly TargetDeco[];
}

/** Прицел: приборная шкала с длинными перекрестиями и горячим ядром. */
const CROSSHAIR: TargetStyle = {
  ringThickness: 1.1,
  ringAlpha: 0.62,
  ringGlow: 1.5,
  wander: 0,
  decorations: [
    { shape: SHAPE_GLOW, tone: 'secondary', r: 2.1, alpha: 0.055, kick: 0.7, kickAlpha: 1.4, layer: 2 },
    { shape: SHAPE_RING, tone: 'secondary', r: 1.72, t: 0.05, alpha: 0.14, glow: 0.8, kick: 0.12, layer: 4 },
    { shape: SHAPE_TICKS, tone: 'sector', r: 1.36, t: 0.16, alpha: 0.16, glow: 0.35, count: 12, p1: 2, spin: 0.12, layer: 6 },
    { shape: SHAPE_TICKS, tone: 'sector', r: 1.55, t: 0.08, alpha: 0.1, glow: 0.3, count: 36, p1: 1.5, spin: -0.06, layer: 6 },
    { shape: SHAPE_BAR, tone: 'primary', r: 0.38, t: 0.05, alpha: 0.26, glow: 0.55, orbit: 1.05, orbitSpeed: 0.16, align: true, kick: 0.3, repeat: 4, dphase: Math.PI / 2, layer: 8 },
    { shape: SHAPE_DASH, tone: 'primary', r: 0.86, t: 0.04, alpha: 0.11, glow: 0.5, count: 24, p1: 0.4, spin: -0.28, layer: 7 },
    { shape: SHAPE_ARC, tone: 'accent', r: 0.5, t: 0.075, alpha: 0.45, glow: 0.8, arc: 2.3, spin: 1.1, kick: 0.4, kickAlpha: 0.3, layer: 11 },
    { shape: SHAPE_DISC, tone: 'accent', r: 0.07, alpha: 0.5, glow: 1.5, pulse: 0.25, pspeed: 5.2, layer: 12 },
  ],
};

/** Секторы: широкие встречные дуги вокруг ядра. */
const SECTORS: TargetStyle = {
  ringThickness: 1,
  ringAlpha: 0.62,
  ringGlow: 1.3,
  wander: 0,
  decorations: [
    { shape: SHAPE_GLOW, tone: 'secondary', r: 2.2, alpha: 0.06, kick: 0.7, kickAlpha: 1.4, layer: 2 },
    { shape: SHAPE_RING, tone: 'primary', r: 1.76, t: 0.045, alpha: 0.12, glow: 0.8, layer: 4 },
    { shape: SHAPE_ARC, tone: 'secondary', r: 1.42, t: 0.15, alpha: 0.28, glow: 0.6, arc: 0.38, spin: 0.48, kick: 0.25, kickAlpha: 0.6, repeat: 3, drot: TAU / 3, layer: 6 },
    { shape: SHAPE_ARC, tone: 'accent', r: 1.14, t: 0.04, alpha: 0.24, glow: 0.8, arc: 0.85, spin: -0.7, repeat: 2, drot: Math.PI, layer: 7 },
    { shape: SHAPE_RING, tone: 'primary', r: 1.28, t: 0.018, alpha: 0.09, glow: 0.5, layer: 5 },
    { shape: SHAPE_TICKS, tone: 'accent', r: 0.72, t: 0.11, alpha: 0.2, glow: 0.4, count: 18, p1: 1.5, spin: 0.34, layer: 9 },
    { shape: SHAPE_RING, tone: 'primary', r: 0.54, t: 0.045, alpha: 0.22, glow: 1.2, breathe: 0.05, bspeed: 2.1, layer: 11 },
    { shape: SHAPE_DISC, tone: 'hot', r: 0.065, alpha: 0.45, glow: 1.4, pulse: 0.3, pspeed: 4.4, layer: 12 },
  ],
};

/** Блуждающее ядро: стабильный внешний контур и живой центр внутри него. */
const WANDER: TargetStyle = {
  ringThickness: 1.6,
  ringAlpha: 0.68,
  ringGlow: 1.8,
  wander: 0.19,
  decorations: [
    { shape: SHAPE_GLOW, tone: 'secondary', r: 2.3, alpha: 0.07, kick: 0.7, kickAlpha: 1.4, layer: 2 },
    { shape: SHAPE_TICKS, tone: 'accent', r: 1.4, t: 0.13, alpha: 0.3, glow: 0.35, count: 8, p1: 4, spin: 0.05, layer: 6 },
    { shape: SHAPE_RING, tone: 'secondary', r: 1.4, t: 0.01, alpha: 0.1, glow: 0.4, layer: 5 },
    { shape: SHAPE_BAR, tone: 'secondary', r: 0.42, t: 0.018, alpha: 0.1, glow: 0.5, orbit: 1.4, align: true, repeat: 2, dphase: Math.PI / 2, layer: 5 },
    { shape: SHAPE_RING, tone: 'primary', r: 1.02, t: 0.05, alpha: 0.2, glow: 1.1, follow: true, kick: 0.2, layer: 9 },
    { shape: SHAPE_DASH, tone: 'primary', r: 0.76, t: 0.026, alpha: 0.14, glow: 0.6, count: 28, p1: 0.45, spin: 0.24, follow: true, layer: 9 },
    { shape: SHAPE_GLOW, tone: 'secondary', r: 0.78, alpha: 0.16, follow: true, kick: 0.5, kickAlpha: 0.8, layer: 10 },
    { shape: SHAPE_DISC, tone: 'secondary', r: 0.2, alpha: 0.7, glow: 1.5, follow: true, kick: 0.35, pulse: 0.12, pspeed: 3.6, layer: 12 },
  ],
};

export const TARGET_STYLES: Record<TargetId, TargetStyle> = {
  target_crosshair: CROSSHAIR,
  target_sectors: SECTORS,
  target_wander: WANDER,
};

export function targetStyle(id: string | undefined): TargetStyle {
  return TARGET_STYLES[id as TargetId] ?? CROSSHAIR;
}
