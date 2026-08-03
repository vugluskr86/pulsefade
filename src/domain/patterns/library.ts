import type { Telegraph } from '../Beat';

export interface BeatStep {
  /** Множитель к базовому интервалу. */
  readonly factor: number;
  readonly telegraph: Telegraph;
}

export interface TempoPattern {
  readonly id: string;
  readonly title: string;
  readonly steps: readonly BeatStep[];
}

const step = (factor: number, telegraph: Telegraph): BeatStep => ({ factor, telegraph });

/** Паттерны из GDD §6 плюс «резкие, но телеграфированные» для Chaos. */
export const PATTERNS: Record<string, TempoPattern> = {
  steady: {
    id: 'steady',
    title: 'ровно',
    steps: [step(1, 'steady'), step(1, 'steady'), step(1, 'steady'), step(1, 'steady')],
  },
  'ramp-up': {
    id: 'ramp-up',
    title: 'плавное ускорение',
    steps: [step(0.98, 'faster'), step(0.93, 'faster'), step(0.88, 'faster'), step(0.83, 'faster')],
  },
  'ramp-down': {
    id: 'ramp-down',
    title: 'плавное замедление',
    steps: [step(1.05, 'slower'), step(1.1, 'slower'), step(1.16, 'slower'), step(1.22, 'slower')],
  },
  'triple-fast': {
    id: 'triple-fast',
    title: '3 одинаковых + быстрый',
    steps: [step(1, 'steady'), step(1, 'steady'), step(1, 'steady'), step(0.55, 'faster')],
  },
  'triple-pause': {
    id: 'triple-pause',
    title: '3 одинаковых + пауза',
    steps: [step(1, 'steady'), step(1, 'steady'), step(1, 'steady'), step(1.8, 'pause')],
  },
  'double-beat': {
    id: 'double-beat',
    title: 'двойной удар',
    steps: [step(1, 'steady'), step(0.32, 'burst'), step(1.1, 'slower')],
  },
  'fake-slowdown': {
    id: 'fake-slowdown',
    title: 'ложное замедление',
    steps: [step(1.18, 'slower'), step(1.26, 'slower'), step(0.72, 'faster')],
  },
  'half-time': {
    id: 'half-time',
    title: 'половинный темп',
    steps: [step(1.9, 'pause'), step(1.9, 'slower'), step(1, 'faster')],
  },
  'double-time': {
    id: 'double-time',
    title: 'двойной темп',
    steps: [step(0.62, 'faster'), step(0.62, 'steady'), step(0.62, 'steady'), step(1.3, 'slower')],
  },
  stutter: {
    id: 'stutter',
    title: 'заикание',
    steps: [step(1, 'steady'), step(0.4, 'burst'), step(0.4, 'burst'), step(1.5, 'pause')],
  },
};

export type PatternId = keyof typeof PATTERNS;

export function getPattern(id: string): TempoPattern {
  const pattern = PATTERNS[id];
  if (!pattern) throw new Error(`Unknown pattern "${id}"`);
  return pattern;
}
