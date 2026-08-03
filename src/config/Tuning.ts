/** Все числа баланса в одном месте — правятся из дебаг-панели на лету (GDD §5). */
export interface JudgeWindows {
  /** Полуширина окна в мс. */
  perfect: number;
  great: number;
  ok: number;
}

export interface ScoreConfig {
  perfect: number;
  great: number;
  ok: number;
  /** Сколько PERFECT нужно для следующего множителя (GDD §8). */
  perfectsPerMultiplier: number;
  maxMultiplier: number;
}

export interface Tuning {
  windows: JudgeWindows;
  /** Время подлёта кольца. Если true — равно длине следующего интервала (см. README §Риск). */
  approachFollowsInterval: boolean;
  approachMs: number;
  minApproachMs: number;
  maxApproachMs: number;
  hitstop: { perfect: number; great: number; miss: number };
  /** Второй тап «двойного» события. */
  doubleTapWindowMs: number;
  holdDurationMs: number;
  holdReleaseWindowMs: number;
  /** Лишние тапы вне окон обнуляют combo. */
  strayTapPenalty: boolean;
  strayDebounceMs: number;
  score: ScoreConfig;
  audio: boolean;
  haptics: boolean;
  particleBudget: number;
}

export const DEFAULT_TUNING: Tuning = {
  windows: { perfect: 40, great: 90, ok: 150 },
  approachFollowsInterval: true,
  approachMs: 620,
  minApproachMs: 260,
  maxApproachMs: 1100,
  hitstop: { perfect: 28, great: 12, miss: 0 },
  doubleTapWindowMs: 240,
  holdDurationMs: 420,
  holdReleaseWindowMs: 150,
  strayTapPenalty: true,
  strayDebounceMs: 130,
  score: { perfect: 100, great: 60, ok: 20, perfectsPerMultiplier: 5, maxMultiplier: 8 },
  audio: true,
  haptics: true,
  particleBudget: 420,
};

export function cloneTuning(source: Tuning = DEFAULT_TUNING): Tuning {
  return {
    ...source,
    windows: { ...source.windows },
    hitstop: { ...source.hitstop },
    score: { ...source.score },
  };
}
