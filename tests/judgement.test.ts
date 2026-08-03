import { describe, expect, it } from 'vitest';
import { gradeFor, worstGrade } from '../src/domain/Judgement';
import { DEFAULT_TUNING } from '../src/config/Tuning';

const windows = DEFAULT_TUNING.windows;

describe('gradeFor', () => {
  it('держит границы окон из GDD §5', () => {
    expect(gradeFor(0, windows)).toBe('perfect');
    expect(gradeFor(40, windows)).toBe('perfect');
    expect(gradeFor(-40, windows)).toBe('perfect');
    expect(gradeFor(41, windows)).toBe('great');
    expect(gradeFor(-90, windows)).toBe('great');
    expect(gradeFor(91, windows)).toBe('ok');
    expect(gradeFor(150, windows)).toBe('ok');
    expect(gradeFor(151, windows)).toBe('miss');
  });

  it('симметричен по знаку ошибки', () => {
    for (let error = 0; error < 200; error += 7) {
      expect(gradeFor(error, windows)).toBe(gradeFor(-error, windows));
    }
  });
});

describe('worstGrade', () => {
  it('выбирает худшую оценку составного события', () => {
    expect(worstGrade('perfect', 'ok')).toBe('ok');
    expect(worstGrade('great', 'miss')).toBe('miss');
    expect(worstGrade('perfect', 'perfect')).toBe('perfect');
  });
});
