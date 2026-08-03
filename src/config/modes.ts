export type ModeId = 'adaptive' | 'chaos' | 'marathon' | 'zen' | 'duel';

/** Режим — это данные, а не подкласс: новый режим добавляется без правки систем (OCP). */
export interface ModeDefinition {
  readonly id: ModeId;
  readonly title: string;
  readonly subtitle: string;
  /** null — раунд без таймера. */
  readonly durationMs: number | null;
  readonly baseIntervalMs: number;
  readonly minIntervalMs: number;
  readonly maxIntervalMs: number;
  /** Множитель базового интервала на каждый удар (<1 — постоянное ускорение). */
  readonly driftPerBeat: number;
  /** Разброс базового интервала при смене паттерна. */
  readonly wander: number;
  readonly patternWeights: Readonly<Record<string, number>>;
  readonly eventChance: number;
  readonly eventsFromBeat: number;
  readonly failAfterMisses: number | null;
  readonly duel: boolean;
}

const CALM_WEIGHTS = {
  steady: 2,
  'ramp-up': 3,
  'ramp-down': 3,
  'triple-fast': 3,
  'triple-pause': 3,
  'double-beat': 2,
  'fake-slowdown': 2,
};

export const MODES: Record<ModeId, ModeDefinition> = {
  adaptive: {
    id: 'adaptive',
    title: 'Adaptive',
    subtitle: 'Стандартный меняющийся темп',
    durationMs: 30_000,
    baseIntervalMs: 620,
    minIntervalMs: 420,
    maxIntervalMs: 820,
    driftPerBeat: 1,
    wander: 0.05,
    patternWeights: CALM_WEIGHTS,
    eventChance: 0,
    eventsFromBeat: 8,
    failAfterMisses: null,
    duel: false,
  },
  chaos: {
    id: 'chaos',
    title: 'Chaos',
    subtitle: 'Резкие, но телеграфированные смены',
    durationMs: 30_000,
    baseIntervalMs: 600,
    minIntervalMs: 380,
    maxIntervalMs: 820,
    driftPerBeat: 1,
    wander: 0.12,
    patternWeights: {
      ...CALM_WEIGHTS,
      steady: 1,
      'half-time': 3,
      'double-time': 3,
      stutter: 3,
      'fake-slowdown': 3,
    },
    eventChance: 0.16,
    eventsFromBeat: 6,
    failAfterMisses: null,
    duel: false,
  },
  marathon: {
    id: 'marathon',
    title: 'Marathon',
    subtitle: 'Постоянное ускорение, три промаха — конец',
    durationMs: null,
    baseIntervalMs: 700,
    minIntervalMs: 230,
    maxIntervalMs: 900,
    driftPerBeat: 0.9955,
    wander: 0.02,
    patternWeights: CALM_WEIGHTS,
    eventChance: 0.08,
    eventsFromBeat: 12,
    failAfterMisses: 3,
    duel: false,
  },
  zen: {
    id: 'zen',
    title: 'Zen',
    subtitle: 'Без поражения, только точность',
    durationMs: null,
    baseIntervalMs: 720,
    minIntervalMs: 520,
    maxIntervalMs: 980,
    driftPerBeat: 1,
    wander: 0.04,
    patternWeights: { ...CALM_WEIGHTS, 'double-beat': 1 },
    eventChance: 0.05,
    eventsFromBeat: 10,
    failAfterMisses: null,
    duel: false,
  },
  duel: {
    id: 'duel',
    title: 'Duel',
    subtitle: 'Одинаковая последовательность паттернов у двух игроков',
    durationMs: 30_000,
    baseIntervalMs: 620,
    minIntervalMs: 420,
    maxIntervalMs: 820,
    driftPerBeat: 1,
    wander: 0.06,
    patternWeights: CALM_WEIGHTS,
    eventChance: 0.1,
    eventsFromBeat: 8,
    failAfterMisses: null,
    duel: true,
  },
};

export const MODE_ORDER: readonly ModeId[] = ['adaptive', 'chaos', 'marathon', 'zen', 'duel'];
