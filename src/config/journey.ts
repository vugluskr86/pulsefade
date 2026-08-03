import type { ModeId } from './modes';

export type Medal = 'none' | 'bronze' | 'silver' | 'gold';

export interface JourneyTrial {
  readonly id: number;
  readonly title: string;
  readonly description: string;
  /** ID режима-основы (обычно 'adaptive'). */
  readonly baseMode: ModeId;
  readonly seed: number;
  readonly durationSec: number;
  /** Список разрешённых ID паттернов (ключи PATTERNS). */
  readonly allowedPatterns: readonly string[];
  readonly eventChance: number;
  readonly eventsFromBeat: number;
  readonly thresholds: {
    /** Минимальный score для получения этой медали. */
    readonly bronze: number;
    readonly silver: number;
    readonly gold: number;
    /** Минимальный perfectRatio (0..1) для silver/gold. */
    readonly perfectRatioForGold: number;
  };
}

export interface JourneyProgress {
  readonly trialId: number;
  readonly bestMedal: Medal;
  readonly bestScore: number;
  readonly bestPerfectRatio: number;
}

export interface JourneyState {
  readonly currentIndex: number;
  readonly trials: readonly JourneyProgress[];
}

/**
 * 12 испытаний Adaptive Journey.
 * Группы: 1–4 вводные, 5–8 серии/множитель, 9–12 смешанные паттерны.
 *
 * Каждое испытание — 30–45 секунд. Оценка: Bronze / Silver / Gold.
 * Gold: score ≥ порога + perfectRatio ≥ gold-порога.
 * Silver: score ≥ порога ИЛИ perfectRatio ≥ silver-порога.
 * Bronze: завершение без досрочного выхода.
 */
export const JOURNEY_TRIALS: readonly JourneyTrial[] = [
  // ── 1–4: вводные ──────────────────────────────────────────
  {
    id: 1,
    title: 'Первый импульс',
    description: 'Стабильный ритм, широкое окно PERFECT. Почувствуй ритм.',
    baseMode: 'adaptive',
    seed: 1001,
    durationSec: 30,
    allowedPatterns: ['steady'],
    eventChance: 0,
    eventsFromBeat: 8,
    thresholds: { bronze: 300, silver: 800, gold: 1500, perfectRatioForGold: 0.7 },
  },
  {
    id: 2,
    title: 'Ускорение',
    description: 'Плавное нарастание темпа. Следи за скоростью кольца.',
    baseMode: 'adaptive',
    seed: 1002,
    durationSec: 30,
    allowedPatterns: ['steady', 'ramp-up', 'triple-fast'],
    eventChance: 0,
    eventsFromBeat: 8,
    thresholds: { bronze: 300, silver: 700, gold: 1400, perfectRatioForGold: 0.65 },
  },
  {
    id: 3,
    title: 'Пауза',
    description: 'Замедления и внезапные паузы. Доверяй цвету кольца.',
    baseMode: 'adaptive',
    seed: 1003,
    durationSec: 32,
    allowedPatterns: ['steady', 'ramp-down', 'triple-pause'],
    eventChance: 0,
    eventsFromBeat: 8,
    thresholds: { bronze: 300, silver: 700, gold: 1300, perfectRatioForGold: 0.6 },
  },
  {
    id: 4,
    title: 'Двойной удар',
    description: 'Сдвоенные импульсы. Готовься нажимать дважды.',
    baseMode: 'adaptive',
    seed: 1004,
    durationSec: 32,
    allowedPatterns: ['steady', 'double-beat', 'ramp-up'],
    eventChance: 0,
    eventsFromBeat: 6,
    thresholds: { bronze: 250, silver: 600, gold: 1200, perfectRatioForGold: 0.55 },
  },

  // ── 5–8: серии и множитель ─────────────────────────────────
  {
    id: 5,
    title: 'Серия',
    description: 'Удержи combo для ×2 множителя. MISS сбрасывает прогресс.',
    baseMode: 'adaptive',
    seed: 1005,
    durationSec: 35,
    allowedPatterns: ['steady', 'ramp-up', 'ramp-down', 'triple-fast'],
    eventChance: 0,
    eventsFromBeat: 8,
    thresholds: { bronze: 400, silver: 1000, gold: 2000, perfectRatioForGold: 0.7 },
  },
  {
    id: 6,
    title: 'Смена темпа',
    description: 'Резкие переходы от быстрого к медленному. Не теряй серию.',
    baseMode: 'adaptive',
    seed: 1006,
    durationSec: 35,
    allowedPatterns: ['triple-fast', 'triple-pause', 'ramp-up', 'ramp-down'],
    eventChance: 0,
    eventsFromBeat: 8,
    thresholds: { bronze: 350, silver: 900, gold: 1800, perfectRatioForGold: 0.6 },
  },
  {
    id: 7,
    title: 'Каскад',
    description: 'Комбинированные ускорения. Держи ритм в быстрой смене паттернов.',
    baseMode: 'adaptive',
    seed: 1007,
    durationSec: 35,
    allowedPatterns: ['ramp-up', 'double-beat', 'triple-fast', 'fake-slowdown'],
    eventChance: 0.05,
    eventsFromBeat: 8,
    thresholds: { bronze: 350, silver: 800, gold: 1600, perfectRatioForGold: 0.55 },
  },
  {
    id: 8,
    title: 'Выдержка',
    description: 'Длинные паузы между сериями. Не теряй концентрацию.',
    baseMode: 'adaptive',
    seed: 1008,
    durationSec: 38,
    allowedPatterns: ['steady', 'triple-pause', 'fake-slowdown', 'ramp-down'],
    eventChance: 0.05,
    eventsFromBeat: 8,
    thresholds: { bronze: 300, silver: 700, gold: 1500, perfectRatioForGold: 0.65 },
  },

  // ── 9–12: смешанные паттерны ───────────────────────────────
  {
    id: 9,
    title: 'Двойной темп',
    description: 'Double-beat и ускорения вместе. Реакция на пределе.',
    baseMode: 'adaptive',
    seed: 1009,
    durationSec: 35,
    allowedPatterns: ['double-beat', 'triple-fast', 'ramp-up', 'steady'],
    eventChance: 0.08,
    eventsFromBeat: 6,
    thresholds: { bronze: 300, silver: 700, gold: 1500, perfectRatioForGold: 0.5 },
  },
  {
    id: 10,
    title: 'Обман',
    description: 'Ложные замедления и неожиданные ускорения. Не дай себя обмануть.',
    baseMode: 'adaptive',
    seed: 1010,
    durationSec: 38,
    allowedPatterns: ['fake-slowdown', 'triple-fast', 'ramp-up', 'double-beat'],
    eventChance: 0.1,
    eventsFromBeat: 6,
    thresholds: { bronze: 250, silver: 600, gold: 1400, perfectRatioForGold: 0.5 },
  },
  {
    id: 11,
    title: 'Выбор',
    description: 'Два центра и замедления. Выбирай сторону и попадай в ритм.',
    baseMode: 'adaptive',
    seed: 1011,
    durationSec: 40,
    allowedPatterns: ['steady', 'ramp-down', 'triple-pause', 'fake-slowdown', 'double-beat'],
    eventChance: 0.12,
    eventsFromBeat: 5,
    thresholds: { bronze: 250, silver: 600, gold: 1300, perfectRatioForGold: 0.5 },
  },
  {
    id: 12,
    title: 'Финал',
    description: 'Все типы паттернов и событий. Твоё главное испытание.',
    baseMode: 'adaptive',
    seed: 1012,
    durationSec: 45,
    allowedPatterns: [
      'steady',
      'ramp-up',
      'ramp-down',
      'triple-fast',
      'triple-pause',
      'double-beat',
      'fake-slowdown',
    ],
    eventChance: 0.14,
    eventsFromBeat: 5,
    thresholds: { bronze: 300, silver: 800, gold: 1800, perfectRatioForGold: 0.45 },
  },
];

/** Вычислить медаль по результату испытания. */
export function evaluateMedal(trial: JourneyTrial, score: number, perfectRatio: number): Medal {
  const { thresholds: t } = trial;
  if (score >= t.gold && perfectRatio >= t.perfectRatioForGold) return 'gold';
  if (score >= t.silver || perfectRatio >= t.perfectRatioForGold) return 'silver';
  if (score >= t.bronze) return 'bronze';
  return 'none';
}

export function createInitialJourneyState(): JourneyState {
  return {
    currentIndex: 0,
    trials: JOURNEY_TRIALS.map((t) => ({
      trialId: t.id,
      bestMedal: 'none' as Medal,
      bestScore: 0,
      bestPerfectRatio: 0,
    })),
  };
}

/** Сохранить прогресс Journey в localStorage. */
export function saveJourneyState(state: JourneyState): void {
  try {
    localStorage.setItem('pulsefade:journey', JSON.stringify(state));
  } catch {
    // localStorage может быть недоступен — молча пропускаем
  }
}

/** Загрузить прогресс Journey из localStorage. */
export function loadJourneyState(): JourneyState {
  try {
    const raw = localStorage.getItem('pulsefade:journey');
    if (raw) {
      const parsed = JSON.parse(raw) as JourneyState;
      if (
        parsed &&
        Array.isArray(parsed.trials) &&
        parsed.trials.length === JOURNEY_TRIALS.length
      ) {
        return parsed;
      }
    }
  } catch {
    // повреждённые данные — начинаем заново
  }
  return createInitialJourneyState();
}

/** Обновить прогресс конкретного испытания. */
export function updateJourneyProgress(
  state: JourneyState,
  trialId: number,
  score: number,
  perfectRatio: number,
): JourneyState {
  const idx = state.trials.findIndex((t) => t.trialId === trialId);
  if (idx < 0) return state;

  const trial = JOURNEY_TRIALS.find((t) => t.id === trialId);
  if (!trial) return state;

  const medal = evaluateMedal(trial, score, perfectRatio);
  const existing = state.trials[idx];

  const medalRank: Record<Medal, number> = { none: 0, bronze: 1, silver: 2, gold: 3 };
  const bestMedal = medalRank[medal] > medalRank[existing.bestMedal] ? medal : existing.bestMedal;
  const bestScore = Math.max(score, existing.bestScore);
  const bestPerfectRatio = Math.max(perfectRatio, existing.bestPerfectRatio);

  const newTrials = state.trials.map((t, i) =>
    i === idx ? { ...t, bestMedal, bestScore, bestPerfectRatio } : t,
  );

  // Автоматически продвигаем currentIndex, если испытание пройдено с бронзой или выше
  let newIndex = state.currentIndex;
  if (
    idx === state.currentIndex &&
    medal !== 'none' &&
    state.currentIndex < JOURNEY_TRIALS.length - 1
  ) {
    newIndex = state.currentIndex + 1;
  }

  return { ...state, currentIndex: newIndex, trials: newTrials };
}

/** Занёс ли игрок хотя бы bronze во всех 12 испытаниях. */
export function isJourneyComplete(state: JourneyState): boolean {
  return state.trials.every((t) => t.bestMedal !== 'none');
}
