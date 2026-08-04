import type { ToneId } from './visualThemes';

export type ParticleSetId =
  | 'particles_default' | 'particles_spark' | 'particles_rings' | 'particles_void';

export type ParticleShape = 'disc' | 'bar' | 'ring';

export interface ParticlePreset {
  readonly shape: ParticleShape;
  /** Множитель к базовому количеству частиц из FeedbackSystem. */
  readonly countScale: number;
  /** Начальная скорость в долях min(w,h) в секунду. */
  readonly speed: readonly [number, number];
  readonly life: readonly [number, number];
  readonly size: readonly [number, number];
  /** Вытянутость искры вдоль вектора скорости (для shape: 'bar'). */
  readonly stretch: number;
  readonly drag: number;
  readonly glow: number;
  /** Притяжение обратно к точке попадания: >0 — частицы схлопываются внутрь. */
  readonly pull: number;
  /** Во сколько раз меняется размер к концу жизни (>1 — частица раскрывается). */
  readonly fadeTo: number;
  /** Тон вместо цвета оценки; null — цвет оценки (PERFECT/GREAT/OK). */
  readonly tone: ToneId | null;
  /** Дополнительные расходящиеся кольца на PERFECT. */
  readonly shockwaves: number;
  readonly ringGlow: number;
}

export const PARTICLE_PRESETS: Record<ParticleSetId, ParticlePreset> = {
  /** Импульсы — базовая мягкая пыль. */
  particles_default: {
    shape: 'disc', countScale: 1, speed: [0.35, 1.15], life: [260, 620], size: [0.004, 0.011],
    stretch: 1, drag: 2.6, glow: 1.4, pull: 0, fadeTo: 0.2, tone: null, shockwaves: 0, ringGlow: 1.6,
  },
  /** Искры — быстрые вытянутые трассы с белым ядром. */
  particles_spark: {
    shape: 'bar', countScale: 1.7, speed: [0.9, 2.4], life: [170, 420], size: [0.01, 0.026],
    stretch: 5, drag: 4.2, glow: 2.4, pull: 0, fadeTo: 0.05, tone: null, shockwaves: 0, ringGlow: 2,
  },
  /** Кольца — медленные раскрывающиеся окружности и двойная ударная волна на PERFECT. */
  particles_rings: {
    shape: 'ring', countScale: 0.55, speed: [0.15, 0.5], life: [420, 900], size: [0.012, 0.03],
    stretch: 1, drag: 1.4, glow: 2, pull: 0, fadeTo: 3.2, tone: null, shockwaves: 2, ringGlow: 2.4,
  },
  /** Пустота — частицы разлетаются и втягиваются обратно в точку попадания. */
  particles_void: {
    shape: 'disc', countScale: 1.2, speed: [0.5, 1.35], life: [520, 1100], size: [0.008, 0.02],
    stretch: 1, drag: 1.1, glow: 1.8, pull: 3.4, fadeTo: 0.05, tone: 'secondary', shockwaves: 0, ringGlow: 1.2,
  },
};

export function particlePreset(id: string | undefined): ParticlePreset {
  return PARTICLE_PRESETS[id as ParticleSetId] ?? PARTICLE_PRESETS.particles_default;
}
