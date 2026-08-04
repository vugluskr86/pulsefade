import type { World } from '../core/ecs/World';
import type { EventBus } from '../core/events/EventBus';
import type { GameClock } from '../core/time/Clock';
import type { IRng } from '../core/math/Rng';
import type { Tuning } from '../config/Tuning';
import type { ModeDefinition } from '../config/modes';
import type { Beat } from '../domain/Beat';
import type { JudgementEvent } from '../domain/Judgement';
import type { ScoreState } from '../domain/Scoring';
import type { InputEvent } from '../input/InputEvent';
import type { Entity } from '../core/ecs/World';
import type { BackgroundId, TargetId, VisualThemeId } from '../config/visualThemes';

export interface Viewport {
  width: number;
  height: number;
  cx: number;
  cy: number;
  /** min(width, height) — базовая единица раскладки, всё остальное в её долях. */
  unit: number;
}

export type RoundEndReason = 'time' | 'fail' | 'stopped' | 'replay-finished';

export interface RoundState {
  active: boolean;
  startedAt: number;
  durationMs: number | null;
  misses: number;
  ended: boolean;
  reason: RoundEndReason | null;
  /** Источник ударов исчерпан (реплей) — ждём затухания последних колец. */
  drained: boolean;
}

export interface GameEvents extends Record<string, unknown> {
  judgement: JudgementEvent;
  beatSpawned: { entity: Entity; beat: Beat };
  roundEnded: { reason: RoundEndReason };
}

export interface FxState {
  /** Яркость фоновой пульсации 0..1. */
  background: number;
  /** Короткая вспышка после попадания. */
  flash: number;
  /** Красная вспышка после промаха. */
  damage: number;
  tier: 0 | 1 | 2 | 3;
}

export interface GameContext {
  readonly world: World;
  readonly clock: GameClock;
  readonly bus: EventBus<GameEvents>;
  readonly rng: IRng;
  readonly tuning: Tuning;
  readonly mode: ModeDefinition;
  readonly score: ScoreState;
  readonly view: Viewport;
  readonly round: RoundState;
  readonly fx: FxState;
  /** События ввода текущего кадра. Очищается в конце кадра. */
  readonly inputs: InputEvent[];
  /** В реплее ввод скриптован, а часть эффектов приглушена. */
  readonly replay: boolean;
  visualTheme: VisualThemeId;
  visualBackground: BackgroundId;
  visualTarget: TargetId;
}
