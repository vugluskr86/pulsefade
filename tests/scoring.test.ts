import { describe, expect, it } from 'vitest';
import { DEFAULT_TUNING } from '../src/config/Tuning';
import { DefaultScoreRules, createScoreState, streakTier } from '../src/domain/Scoring';

const rules = () => new DefaultScoreRules(DEFAULT_TUNING.score);

describe('DefaultScoreRules', () => {
  it('растит множитель каждые 5 PERFECT', () => {
    const state = createScoreState();
    const scoring = rules();
    for (let i = 0; i < 4; i += 1) scoring.apply(state, 'perfect');
    expect(state.multiplier).toBe(1);
    scoring.apply(state, 'perfect');
    expect(state.multiplier).toBe(2);
    for (let i = 0; i < 5; i += 1) scoring.apply(state, 'perfect');
    expect(state.multiplier).toBe(3);
  });

  it('MISS обнуляет combo и множитель', () => {
    const state = createScoreState();
    const scoring = rules();
    for (let i = 0; i < 6; i += 1) scoring.apply(state, 'perfect');
    const scoreBeforeMiss = state.score;
    scoring.apply(state, 'miss');
    expect(state.combo).toBe(0);
    expect(state.multiplier).toBe(1);
    expect(state.score).toBe(scoreBeforeMiss);
    expect(state.bestCombo).toBe(6);
  });

  it('OK не умножается на множитель', () => {
    const state = createScoreState();
    const scoring = rules();
    for (let i = 0; i < 5; i += 1) scoring.apply(state, 'perfect');
    const gained = scoring.apply(state, 'ok');
    expect(gained).toBe(DEFAULT_TUNING.score.ok);
  });
});

describe('streakTier', () => {
  it('соответствует ступеням визуала из GDD §9', () => {
    expect(streakTier(0)).toBe(0);
    expect(streakTier(4)).toBe(0);
    expect(streakTier(5)).toBe(1);
    expect(streakTier(10)).toBe(2);
    expect(streakTier(20)).toBe(3);
  });
});
