import type { JudgeWindows } from '../config/Tuning';
import type { BeatKind } from './Beat';

export type Grade = 'perfect' | 'great' | 'ok' | 'miss';

export const GRADE_LABEL: Record<Grade, string> = {
  perfect: 'perfect',
  great: 'great',
  ok: 'ok',
  miss: 'miss',
};

/** GDD §5: PERFECT ±40, GREAT ±90, OK ±150, остальное — MISS. */
export function gradeFor(errorMs: number, windows: JudgeWindows): Grade {
  const error = Math.abs(errorMs);
  if (error <= windows.perfect) return 'perfect';
  if (error <= windows.great) return 'great';
  if (error <= windows.ok) return 'ok';
  return 'miss';
}

export const isHit = (grade: Grade): boolean => grade !== 'miss';

/** Худшая из двух оценок — для составных событий (двойной тап, удержание). */
const ORDER: Record<Grade, number> = { perfect: 3, great: 2, ok: 1, miss: 0 };
export const worstGrade = (a: Grade, b: Grade): Grade => (ORDER[a] <= ORDER[b] ? a : b);

export interface JudgementEvent {
  readonly grade: Grade;
  readonly errorMs: number;
  readonly kind: BeatKind;
  readonly beatIndex: number;
  readonly targetTime: number;
  readonly hitTime: number | null;
  /** Экранная позиция для эффектов, в пикселях. */
  readonly x: number;
  readonly y: number;
  /** Тап вне всех окон. */
  readonly stray: boolean;
}
