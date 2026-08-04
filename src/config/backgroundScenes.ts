import {
  SHAPE_ARC, SHAPE_BAR, SHAPE_DASH, SHAPE_DISC, SHAPE_GLOW, SHAPE_RING,
  SHAPE_SWEEP, SHAPE_TICKS, SHAPE_WAVE, SHAPE_WEDGE, type ShapeKind,
} from '../render/IRenderer';
import type { BackgroundId, ToneId } from './visualThemes';

const HALF_PI = Math.PI / 2;

/**
 * Один слой сцены. Все размеры — в долях от min(width, height),
 * поэтому одна и та же сцена одинаково собирается на телефоне и на десктопе.
 */
export interface SceneLayer {
  readonly shape: ShapeKind;
  readonly tone: ToneId;
  readonly alpha: number;
  /** Радиус (для BAR/WAVE — половина длины). */
  readonly r: number;
  /** Толщина штриха (для WEDGE/SWEEP — радиальная глубина, для WAVE — амплитуда). */
  readonly t?: number;
  readonly soft?: number;
  /** Сила неонового ореола. */
  readonly glow?: number;
  readonly x?: number;
  readonly y?: number;
  readonly rot?: number;
  /** Собственное вращение, рад/с. */
  readonly spin?: number;
  readonly arc?: number;
  readonly count?: number;
  readonly p1?: number;
  readonly p2?: number;
  /** Дыхание радиуса. */
  readonly breathe?: number;
  readonly bspeed?: number;
  /** Эллиптический дрейф позиции; при driftX === driftY получается орбита. */
  readonly driftX?: number;
  readonly driftY?: number;
  readonly dspeed?: number;
  readonly phase?: number;
  /** Мерцание альфы 0..1. */
  readonly flicker?: number;
  readonly fspeed?: number;
  /** Насколько слой откликается на попадания (fx.background / fx.flash). */
  readonly react?: number;
  /** Поток «на зрителя»: фаза 0..1, радиус идёт от r к flowTo. */
  readonly flow?: number;
  readonly flowTo?: number;
  readonly layer?: number;
  /** Клонирование слоя с шагом по каждому полю. */
  readonly repeat?: number;
  readonly dr?: number;
  readonly drot?: number;
  readonly dx?: number;
  readonly dy?: number;
  readonly dalpha?: number;
  readonly dphase?: number;
  readonly dflow?: number;
}

export interface SceneHaze {
  readonly r: number;
  readonly tone: ToneId;
  readonly alpha: number;
  readonly x?: number;
  readonly y?: number;
  readonly react?: number;
  /** Крутизна спада свечения: 2 — широкая дымка, 4 — компактное пятно. */
  readonly falloff?: number;
}

export interface BackgroundScene {
  readonly haze: readonly SceneHaze[];
  readonly flowSpeed?: number;
  readonly layers: readonly SceneLayer[];
}

/** Реактор — концентрический «ключевой арт»: горячее ядро, кольца и звуковая дорожка. */
const REACTOR: BackgroundScene = {
  haze: [
    { r: 1.55, tone: 'near', alpha: 0.34, falloff: 2.2 },
    { r: 0.95, tone: 'far', alpha: 0.24, react: 1, falloff: 2.6 },
    { r: 0.52, tone: 'mid', alpha: 0.16, react: 1.4, falloff: 3 },
  ],
  layers: [
    { shape: SHAPE_DASH, tone: 'primary', r: 0.86, t: 0.005, alpha: 0.08, glow: 0.7, count: 60, p1: 0.4, spin: -0.03 },
    { shape: SHAPE_RING, tone: 'accent', r: 0.66, t: 0.013, alpha: 0.2, glow: 1.6, react: 0.8, breathe: 0.014, bspeed: 0.9 },
    { shape: SHAPE_RING, tone: 'secondary', r: 0.575, t: 0.004, alpha: 0.14, glow: 0.9 },
    { shape: SHAPE_RING, tone: 'hot', r: 0.49, t: 0.011, alpha: 0.17, glow: 1.9, react: 1.2, breathe: 0.01, bspeed: 1.4 },
    { shape: SHAPE_TICKS, tone: 'sector', r: 0.44, t: 0.016, alpha: 0.09, glow: 0.5, count: 48, p1: 2, spin: 0.05 },
    { shape: SHAPE_RING, tone: 'primary', r: 0.375, t: 0.007, alpha: 0.16, glow: 1.3, breathe: 0.008, bspeed: 1.1 },
    { shape: SHAPE_WAVE, tone: 'secondary', r: 0.45, t: 0.04, alpha: 0.15, glow: 1.1, p1: 0.075, x: -0.5, react: 1.4, repeat: 2, dx: 1 },
  ],
};

/** Портал — огромное зубчатое кольцо, световые колонны и неоновый пол. */
const PORTAL: BackgroundScene = {
  haze: [
    { r: 1.45, tone: 'near', alpha: 0.3, falloff: 2.2 },
    { r: 0.92, tone: 'far', alpha: 0.22, react: 1, falloff: 2.8 },
    { r: 1.2, tone: 'mid', alpha: 0.14, y: 0.55, falloff: 2.4 },
  ],
  layers: [
    { shape: SHAPE_TICKS, tone: 'primary', r: 0.53, t: 0.045, alpha: 0.1, glow: 1, count: 46, p1: 6, spin: 0.05 },
    { shape: SHAPE_RING, tone: 'primary', r: 0.505, t: 0.01, alpha: 0.24, glow: 1.9, breathe: 0.01, bspeed: 0.55 },
    { shape: SHAPE_RING, tone: 'primary', r: 0.455, t: 0.008, alpha: 0.2, glow: 1.7, breathe: 0.01, bspeed: 0.55, react: 0.6 },
    { shape: SHAPE_DASH, tone: 'secondary', r: 0.41, t: 0.004, alpha: 0.11, glow: 0.8, count: 64, p1: 0.5, spin: -0.04 },
    { shape: SHAPE_BAR, tone: 'primary', r: 0.42, t: 0.003, alpha: 0.13, glow: 1.3, rot: HALF_PI, x: -0.4, y: -0.47, repeat: 4, dx: 0.267 },
    { shape: SHAPE_BAR, tone: 'secondary', r: 1, t: 0.004, alpha: 0.28, glow: 1.9, y: 0.62, react: 0.7 },
    { shape: SHAPE_WEDGE, tone: 'accent', r: 1.2, t: 1.2, arc: 0.025, alpha: 0.1, glow: 1.1, x: 0, y: 0.62, rot: HALF_PI - 0.72, repeat: 7, drot: 0.24 },
  ],
};

/** Горизонт — радар за неоновой линией горизонта и уходящий в перспективу пол. */
const HORIZON: BackgroundScene = {
  haze: [
    { r: 1.5, tone: 'near', alpha: 0.3, falloff: 2.2 },
    { r: 0.85, tone: 'far', alpha: 0.2, y: 0.5, react: 1, falloff: 2.6 },
    { r: 0.7, tone: 'mid', alpha: 0.12, y: -0.5, falloff: 3 },
  ],
  layers: [
    { shape: SHAPE_RING, tone: 'accent', r: 0.42, y: 0.44, t: 0.012, alpha: 0.24, glow: 1.9, react: 0.9, breathe: 0.016, bspeed: 0.7 },
    { shape: SHAPE_RING, tone: 'primary', r: 0.29, y: 0.44, t: 0.007, alpha: 0.17, glow: 1.4 },
    { shape: SHAPE_DASH, tone: 'secondary', r: 0.54, y: 0.44, t: 0.004, alpha: 0.11, glow: 0.9, count: 52, p1: 0.45, spin: 0.05 },
    { shape: SHAPE_TICKS, tone: 'sector', r: 0.68, y: 0.44, t: 0.018, alpha: 0.07, count: 40, p1: 2, spin: -0.03 },
    { shape: SHAPE_BAR, tone: 'secondary', r: 1.1, t: 0.004, y: 0.44, alpha: 0.3, glow: 2, react: 0.7 },
    { shape: SHAPE_WEDGE, tone: 'primary', r: 1.3, t: 1.3, arc: 0.024, alpha: 0.11, glow: 1.1, y: 0.44, rot: HALF_PI - 0.8, repeat: 9, drot: 0.2 },
    { shape: SHAPE_WEDGE, tone: 'far', r: 1.15, t: 0.62, arc: 0.5, alpha: 0.16, glow: 0.5, y: -0.92, rot: 1.02, repeat: 2, drot: 1.1 },
    { shape: SHAPE_BAR, tone: 'primary', r: 0.45, t: 0.003, rot: HALF_PI, x: -0.45, y: -0.34, alpha: 0.16, glow: 1.3, repeat: 2, dx: 0.9 },
  ],
};

/** Орбиты — смещённые эксцентричные траектории с бегущими огнями. */
const ORBIT: BackgroundScene = {
  haze: [
    { r: 1.35, tone: 'near', alpha: 0.28, falloff: 2.2 },
    { r: 0.72, tone: 'far', alpha: 0.22, x: 0.18, y: -0.12, react: 1, falloff: 2.8 },
    { r: 0.5, tone: 'mid', alpha: 0.12, x: -0.3, y: 0.3, falloff: 3 },
  ],
  layers: [
    { shape: SHAPE_RING, tone: 'far', r: 0.74, x: -0.07, y: 0.05, t: 0.006, alpha: 0.16, glow: 0.9, driftX: 0.05, driftY: 0.04, dspeed: 0.18 },
    { shape: SHAPE_RING, tone: 'secondary', r: 0.6, x: 0.08, y: -0.06, t: 0.006, alpha: 0.16, glow: 1.2, driftX: 0.05, driftY: 0.04, dspeed: 0.13 },
    { shape: SHAPE_RING, tone: 'primary', r: 0.48, x: -0.09, y: -0.02, t: 0.005, alpha: 0.15, glow: 1.2, driftX: 0.04, driftY: 0.05, dspeed: 0.22 },
    { shape: SHAPE_RING, tone: 'sector', r: 0.375, x: 0.06, y: 0.07, t: 0.008, alpha: 0.19, glow: 1.6, react: 0.8, driftX: 0.03, driftY: 0.025, dspeed: 0.3 },
    { shape: SHAPE_SWEEP, tone: 'secondary', r: 0.34, t: 0.085, x: 0.06, y: 0.07, arc: 2.4, alpha: 0.17, glow: 1.4, spin: 0.22, driftX: 0.03, driftY: 0.025, dspeed: 0.3 },
    { shape: SHAPE_DISC, tone: 'primary', r: 0.009, alpha: 0.45, glow: 2, x: 0.08, y: -0.06, driftX: 0.6, driftY: 0.6, dspeed: 0.16, repeat: 5, dphase: 1.2566, flicker: 0.3, fspeed: 2 },
    { shape: SHAPE_DISC, tone: 'accent', r: 0.007, alpha: 0.38, glow: 1.8, x: -0.09, y: -0.02, driftX: 0.48, driftY: 0.48, dspeed: -0.24, repeat: 3, dphase: 2.0944, flicker: 0.4, fspeed: 3 },
  ],
};

/** Туннель — кольца, летящие из глубины на зрителя. */
const TUNNEL: BackgroundScene = {
  flowSpeed: 0.17,
  haze: [
    { r: 1.4, tone: 'near', alpha: 0.26, falloff: 2.2 },
    { r: 0.55, tone: 'far', alpha: 0.26, react: 1.4, falloff: 3.2 },
  ],
  layers: [
    { shape: SHAPE_WEDGE, tone: 'far', r: 1.15, t: 0.78, arc: 0.5, alpha: 0.2, glow: 0.6, spin: 0.09, repeat: 4, drot: HALF_PI },
    { shape: SHAPE_RING, tone: 'primary', r: 0.06, flowTo: 1.1, t: 0.009, alpha: 0.22, glow: 1.6, flow: 0, repeat: 6, dflow: 0.1667 },
    { shape: SHAPE_TICKS, tone: 'sector', r: 0.06, flowTo: 1.1, t: 0.02, alpha: 0.11, glow: 0.7, count: 36, p1: 2, spin: 0.1, flow: 0.08, repeat: 3, dflow: 0.3333 },
    { shape: SHAPE_RING, tone: 'accent', r: 0.41, t: 0.011, alpha: 0.2, glow: 1.8, react: 1.2, breathe: 0.012, bspeed: 1.6 },
    { shape: SHAPE_TICKS, tone: 'accent', r: 0.46, t: 0.016, alpha: 0.11, glow: 0.7, count: 24, p1: 2, spin: -0.16 },
  ],
};

/** Сканер — приборный радар с вращающимся лучом и перекрестием. */
const SCANNER: BackgroundScene = {
  haze: [
    { r: 1.45, tone: 'near', alpha: 0.3, falloff: 2.2 },
    { r: 0.8, tone: 'far', alpha: 0.2, react: 1, falloff: 2.8 },
  ],
  layers: [
    { shape: SHAPE_SWEEP, tone: 'primary', r: 0.6, t: 0.6, arc: 1.4, alpha: 0.11, glow: 0.9, spin: 0.85, p1: 2 },
    { shape: SHAPE_RING, tone: 'primary', r: 0.6, t: 0.011, alpha: 0.28, glow: 2, react: 0.7 },
    { shape: SHAPE_RING, tone: 'primary', r: 0.43, t: 0.004, alpha: 0.13, glow: 1.1 },
    { shape: SHAPE_TICKS, tone: 'accent', r: 0.52, t: 0.045, alpha: 0.22, glow: 1.5, count: 8, p1: 5, spin: 0.03 },
    { shape: SHAPE_TICKS, tone: 'sector', r: 0.68, t: 0.018, alpha: 0.08, count: 60, p1: 2, spin: -0.02 },
    { shape: SHAPE_BAR, tone: 'primary', r: 0.13, t: 0.004, alpha: 0.2, glow: 1.3, x: -0.46, repeat: 2, dx: 0.92 },
    { shape: SHAPE_BAR, tone: 'primary', r: 0.13, t: 0.004, rot: HALF_PI, alpha: 0.2, glow: 1.3, y: -0.46, repeat: 2, dy: 0.92 },
    { shape: SHAPE_DASH, tone: 'secondary', r: 0.78, t: 0.004, alpha: 0.09, glow: 0.7, count: 44, p1: 0.4, spin: 0.06 },
  ],
};

/** Контур — HUD-рамка: боковые рейки, наклонные лучи и мерцающие индикаторы. */
const FRAME: BackgroundScene = {
  haze: [
    { r: 1.5, tone: 'near', alpha: 0.32, falloff: 2 },
    { r: 0.78, tone: 'far', alpha: 0.22, react: 1, falloff: 2.8 },
  ],
  layers: [
    { shape: SHAPE_BAR, tone: 'primary', r: 1, t: 0.0035, rot: HALF_PI, x: -0.455, alpha: 0.28, glow: 1.9, repeat: 2, dx: 0.91 },
    { shape: SHAPE_BAR, tone: 'secondary', r: 1, t: 0.0025, rot: HALF_PI, x: -0.42, alpha: 0.1, glow: 0.9, repeat: 2, dx: 0.84 },
    { shape: SHAPE_BAR, tone: 'primary', r: 0.46, t: 0.0035, rot: -0.62, x: -0.22, y: -0.58, alpha: 0.26, glow: 1.9, react: 0.5 },
    { shape: SHAPE_BAR, tone: 'primary', r: 0.46, t: 0.0035, rot: 0.62, x: 0.22, y: -0.58, alpha: 0.26, glow: 1.9, react: 0.5 },
    { shape: SHAPE_ARC, tone: 'secondary', r: 0.6, t: 0.007, arc: 0.5, rot: 0.785, alpha: 0.16, glow: 1.3, repeat: 4, drot: HALF_PI },
    { shape: SHAPE_RING, tone: 'secondary', r: 0.4, t: 0.0035, alpha: 0.12, glow: 0.9, flicker: 0.25, fspeed: 5 },
    { shape: SHAPE_TICKS, tone: 'primary', r: 0.46, t: 0.02, alpha: 0.14, glow: 1.1, count: 4, p1: 6, rot: 0.785 },
    { shape: SHAPE_DISC, tone: 'accent', r: 0.006, alpha: 0.4, glow: 1.9, x: -0.37, y: 0.3, repeat: 8, dy: 0.055, flicker: 0.55, fspeed: 3, dphase: 0.6 },
    { shape: SHAPE_DISC, tone: 'accent', r: 0.006, alpha: 0.4, glow: 1.9, x: 0.37, y: 0.3, repeat: 8, dy: 0.055, flicker: 0.55, fspeed: 3, dphase: 0.9 },
  ],
};

/** Затмение — медленно проходящий источник света и его серп. */
const ECLIPSE: BackgroundScene = {
  haze: [
    { r: 1.4, tone: 'near', alpha: 0.28, falloff: 2.2 },
    { r: 0.46, tone: 'accent', alpha: 0.14, x: 0.26, y: -0.26, falloff: 3 },
    { r: 0.8, tone: 'far', alpha: 0.18, x: -0.2, y: 0.22, react: 1, falloff: 2.6 },
  ],
  layers: [
    { shape: SHAPE_GLOW, tone: 'accent', r: 0.42, x: 0.26, y: -0.26, alpha: 0.2, p1: 2.4, driftX: 0.07, driftY: 0.05, dspeed: 0.12 },
    { shape: SHAPE_SWEEP, tone: 'hot', r: 0.38, t: 0.06, x: 0.26, y: -0.26, arc: 2.6, alpha: 0.2, glow: 1.9, spin: 0.07, driftX: 0.07, driftY: 0.05, dspeed: 0.12 },
    { shape: SHAPE_RING, tone: 'secondary', r: 0.4, x: 0.26, y: -0.26, t: 0.005, alpha: 0.15, glow: 1.3, driftX: 0.07, driftY: 0.05, dspeed: 0.12 },
    { shape: SHAPE_RING, tone: 'far', r: 0.58, t: 0.004, alpha: 0.13, glow: 0.8, breathe: 0.022, bspeed: 0.34, react: 0.6, repeat: 3, dr: 0.17, dalpha: -0.03 },
    { shape: SHAPE_DASH, tone: 'primary', r: 0.8, t: 0.0035, alpha: 0.09, glow: 0.7, count: 80, p1: 0.45, spin: 0.02 },
    { shape: SHAPE_ARC, tone: 'accent', r: 0.7, t: 0.009, arc: 0.9, rot: -0.6, alpha: 0.14, glow: 1.5, spin: -0.05 },
  ],
};

/** Врата — две встречные световые системы и приборная полоса снизу. */
const GATES: BackgroundScene = {
  haze: [
    { r: 1.45, tone: 'near', alpha: 0.3, falloff: 2.2 },
    { r: 0.85, tone: 'far', alpha: 0.22, react: 1, falloff: 2.8 },
  ],
  layers: [
    { shape: SHAPE_WEDGE, tone: 'primary', r: 1.5, t: 1.1, y: -0.95, arc: 0.19, rot: 1.12, alpha: 0.16, glow: 1.3, p2: 0.05 },
    { shape: SHAPE_WEDGE, tone: 'primary', r: 1.5, t: 1.1, y: -0.95, arc: 0.19, rot: 2.02, alpha: 0.16, glow: 1.3, p2: 0.05 },
    { shape: SHAPE_ARC, tone: 'secondary', r: 0.42, t: 0.013, arc: 0.6, rot: 0, alpha: 0.26, glow: 1.9, react: 0.6, repeat: 2, drot: Math.PI },
    { shape: SHAPE_ARC, tone: 'primary', r: 0.4, t: 0.02, arc: 0.34, rot: -HALF_PI, alpha: 0.26, glow: 1.9, react: 0.8 },
    { shape: SHAPE_ARC, tone: 'secondary', r: 0.4, t: 0.02, arc: 0.34, rot: HALF_PI, alpha: 0.26, glow: 1.9, react: 0.8 },
    { shape: SHAPE_RING, tone: 'secondary', r: 0.47, t: 0.0035, alpha: 0.12, glow: 0.9 },
    { shape: SHAPE_RING, tone: 'accent', r: 0.36, t: 0.01, alpha: 0.2, glow: 1.8, react: 1, breathe: 0.01, bspeed: 1.2 },
    { shape: SHAPE_TICKS, tone: 'sector', r: 0.31, t: 0.014, alpha: 0.1, glow: 0.7, count: 12, p1: 2, spin: 0.06 },
    { shape: SHAPE_BAR, tone: 'primary', r: 0.17, t: 0.016, y: 0.7, alpha: 0.32, glow: 2.2, react: 1.2 },
    { shape: SHAPE_BAR, tone: 'secondary', r: 0.012, t: 0.05, y: 0.7, x: -0.22, alpha: 0.24, glow: 1.5, repeat: 2, dx: 0.44 },
  ],
};

/** Созвездие — тихое поле мерцающих сигналов на концентрических орбитах. */
const CONSTELLATION: BackgroundScene = {
  haze: [
    { r: 1.5, tone: 'near', alpha: 0.24, falloff: 2.4 },
    { r: 0.7, tone: 'far', alpha: 0.18, react: 1.2, falloff: 3 },
  ],
  layers: [
    { shape: SHAPE_RING, tone: 'far', r: 0.6, t: 0.018, alpha: 0.14, glow: 0.6 },
    { shape: SHAPE_RING, tone: 'primary', r: 0.54, t: 0.007, alpha: 0.23, glow: 1.9, react: 0.6 },
    { shape: SHAPE_RING, tone: 'primary', r: 0.4, t: 0.004, alpha: 0.15, glow: 1.3 },
    { shape: SHAPE_TICKS, tone: 'sector', r: 0.4, t: 0.018, alpha: 0.1, count: 16, p1: 2, spin: 0.04 },
    { shape: SHAPE_TICKS, tone: 'sector', r: 0.6, t: 0.026, alpha: 0.09, count: 12, p1: 3, spin: -0.02 },
    { shape: SHAPE_DISC, tone: 'primary', r: 0.01, alpha: 0.45, glow: 2, driftX: 0.54, driftY: 0.54, dspeed: 0.02, repeat: 4, dphase: HALF_PI, flicker: 0.45, fspeed: 2.4 },
    { shape: SHAPE_DISC, tone: 'accent', r: 0.007, alpha: 0.38, glow: 1.8, driftX: 0.4, driftY: 0.4, dspeed: -0.03, phase: 0.785, repeat: 4, dphase: HALF_PI, flicker: 0.5, fspeed: 3.1 },
    { shape: SHAPE_DISC, tone: 'sector', r: 0.005, alpha: 0.32, glow: 1.8, driftX: 0.76, driftY: 0.7, dspeed: 0.05, repeat: 12, dphase: 0.91, flicker: 0.7, fspeed: 4 },
    { shape: SHAPE_ARC, tone: 'accent', r: 0.44, t: 0.009, arc: 1.9, alpha: 0.22, glow: 1.7, spin: 0.5, react: 1 },
  ],
};

export const BACKGROUND_SCENES: Record<BackgroundId, BackgroundScene> = {
  background_reactor: REACTOR,
  background_portal: PORTAL,
  background_horizon: HORIZON,
  background_orbit: ORBIT,
  background_tunnel: TUNNEL,
  background_scanner: SCANNER,
  background_frame: FRAME,
  background_eclipse: ECLIPSE,
  background_gates: GATES,
  background_constellation: CONSTELLATION,
};

export function backgroundScene(id: string | undefined): BackgroundScene {
  return BACKGROUND_SCENES[id as BackgroundId] ?? REACTOR;
}
