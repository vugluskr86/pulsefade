import { describe, expect, it } from 'vitest';
import { SeededRng } from '../src/core/math/Rng';
import { DEFAULT_TUNING } from '../src/config/Tuning';
import { MODES } from '../src/config/modes';
import { PatternBeatSource } from '../src/domain/patterns/PatternBeatSource';
import type { Beat } from '../src/domain/Beat';

const take = (seed: number, count: number, mode = MODES.adaptive): Beat[] => {
  const source = new PatternBeatSource({
    rng: new SeededRng(seed),
    mode,
    tuning: DEFAULT_TUNING,
    startTime: 0,
  });
  return Array.from({ length: count }, () => source.next());
};

describe('PatternBeatSource', () => {
  it('одинаковый seed даёт одинаковую последовательность (основа Duel)', () => {
    expect(take(12345, 60)).toEqual(take(12345, 60));
  });

  it('разные seed расходятся', () => {
    expect(take(1, 40)).not.toEqual(take(2, 40));
  });

  it('время строго возрастает, интервалы в разумных границах', () => {
    const beats = take(777, 200);
    for (let i = 1; i < beats.length; i += 1) {
      expect(beats[i]!.targetTime).toBeGreaterThan(beats[i - 1]!.targetTime);
      expect(beats[i]!.interval).toBeGreaterThanOrEqual(175);
      expect(beats[i]!.interval).toBeLessThanOrEqual(2200);
    }
  });

  it('подлёт кольца равен интервалу — темп видно до того, как нужно реагировать', () => {
    const beats = take(42, 120);
    for (const beat of beats.slice(1)) {
      const expected = Math.min(
        Math.max(beat.interval, DEFAULT_TUNING.minApproachMs),
        DEFAULT_TUNING.maxApproachMs,
      );
      expect(beat.approachMs).toBeCloseTo(expected, 5);
    }
  });

  it('Marathon постепенно ускоряется', () => {
    const beats = take(9, 300, MODES.marathon);
    const head = beats.slice(0, 20).reduce((sum, beat) => sum + beat.interval, 0) / 20;
    const tail = beats.slice(-20).reduce((sum, beat) => sum + beat.interval, 0) / 20;
    expect(tail).toBeLessThan(head);
  });

  it('после удержания остаётся место для отпускания', () => {
    const beats = take(31337, 400, MODES.chaos);
    let holds = 0;
    for (let i = 0; i < beats.length - 1; i += 1) {
      if (beats[i]!.kind !== 'hold') continue;
      holds += 1;
      expect(beats[i + 1]!.interval).toBeGreaterThanOrEqual(
        DEFAULT_TUNING.holdDurationMs + 300,
      );
    }
    expect(holds).toBeGreaterThan(0);
  });

  it('Adaptive не выдаёт спец-событий — сначала проверяется базовый one-tap', () => {
    expect(take(5, 200).every((beat) => beat.kind === 'tap')).toBe(true);
  });
});
