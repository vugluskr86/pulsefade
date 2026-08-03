import type { ScoreConfig } from '../config/Tuning';
import type { Grade } from './Judgement';

export interface ScoreState {
  score: number;
  combo: number;
  bestCombo: number;
  multiplier: number;
  perfectRun: number;
  judged: number;
  counts: Record<Grade, number>;
}

export function createScoreState(): ScoreState {
  return {
    score: 0,
    combo: 0,
    bestCombo: 0,
    multiplier: 1,
    perfectRun: 0,
    judged: 0,
    counts: { perfect: 0, great: 0, ok: 0, miss: 0 },
  };
}

/** LSP: любое правило подсчёта подставляется вместо стандартного без правки систем. */
export interface IScoreRules {
  apply(state: ScoreState, grade: Grade): number;
}

export class DefaultScoreRules implements IScoreRules {
  constructor(private readonly config: ScoreConfig) {}

  /** Возвращает начисленные очки. GDD §8. */
  apply(state: ScoreState, grade: Grade): number {
    state.judged += 1;
    state.counts[grade] += 1;

    if (grade === 'miss') {
      state.combo = 0;
      state.perfectRun = 0;
      state.multiplier = 1;
      return 0;
    }

    state.combo += 1;
    state.bestCombo = Math.max(state.bestCombo, state.combo);

    if (grade === 'perfect') {
      state.perfectRun += 1;
      state.multiplier = Math.min(
        this.config.maxMultiplier,
        1 + Math.floor(state.perfectRun / this.config.perfectsPerMultiplier),
      );
    }

    const gained =
      grade === 'perfect'
        ? this.config.perfect * state.multiplier
        : grade === 'great'
          ? this.config.great * state.multiplier
          : this.config.ok;

    state.score += gained;
    return gained;
  }
}

export const accuracyOf = (state: ScoreState): number =>
  state.judged === 0 ? 0 : state.counts.perfect / state.judged;

/** GDD §9: визуальные ступени серии. */
export function streakTier(combo: number): 0 | 1 | 2 | 3 {
  if (combo >= 20) return 3;
  if (combo >= 10) return 2;
  if (combo >= 5) return 1;
  return 0;
}
