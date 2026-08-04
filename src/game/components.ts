import { defineComponent, type Entity } from '../core/ecs/World';
import type { ShapeKind } from '../render/IRenderer';
import type { Beat } from '../domain/Beat';
import type { Grade } from '../domain/Judgement';

export type MutableColor = [number, number, number, number];

export interface TransformData {
  x: number;
  y: number;
}

export interface SpriteData {
  shape: ShapeKind;
  radius: number;
  thickness: number;
  softness: number;
  color: MutableColor;
  layer: number;
  rotation?: number;
  arc?: number;
  /** Сила неонового ореола: 0 — плоско, 1..2.5 — свечение как в референсах. */
  glow?: number;
  /** TICKS/DASH: количество штрихов. */
  count?: number;
  /** TICKS: ширина штриха, DASH: скважность, WAVE: частота, GLOW: спад. */
  param?: number;
  /** WEDGE: мягкость краёв, WAVE: фаза. */
  param2?: number;
}

export interface PulseData {
  beat: Beat;
  spawnTime: number;
  state: 'pending' | 'resolved';
  resolvedAt: number;
  grade: Grade | null;
  /** Прогресс составных событий. */
  taps: number;
  firstTapTime: number;
  firstGrade: Grade;
  holdStartedAt: number | null;
  /** Вспомогательный спрайт: шкала удержания. */
  aux: Entity | null;
  anchorX: number;
  /** A subset of beats travel as an arc and align with the sector in the target. */
  sector: boolean;
  sectorAngle: number;
  sectorArc: number;
}

export interface ParticleData {
  vx: number;
  vy: number;
  drag: number;
  /** Ускорение обратно к точке рождения (набор «Пустота»). */
  pull: number;
  originX: number;
  originY: number;
}

export interface LifetimeData {
  left: number;
  total: number;
}

export interface TweenData {
  radiusFrom: number;
  radiusTo: number;
  alphaFrom: number;
  alphaTo: number;
  thicknessFrom: number;
  thicknessTo: number;
  /** 0 — линейно, 1 — easeOutCubic. */
  ease: 0 | 1;
}

export type TargetRole = 'center' | 'left' | 'right';

export interface TargetData {
  role: TargetRole;
  /** Текущая «отдача» от попадания 0..1. */
  kick: number;
  visibility: number;
  variant: number;
  sectorAngle: number;
  decorations: Entity[];
}

export const Transform = defineComponent<TransformData>('Transform');
export const Sprite = defineComponent<SpriteData>('Sprite');
export const Pulse = defineComponent<PulseData>('Pulse');
export const Particle = defineComponent<ParticleData>('Particle');
export const Lifetime = defineComponent<LifetimeData>('Lifetime');
export const Tween = defineComponent<TweenData>('Tween');
export const Target = defineComponent<TargetData>('Target');

export const copyColor = (color: readonly [number, number, number, number]): MutableColor => [
  color[0],
  color[1],
  color[2],
  color[3],
];
