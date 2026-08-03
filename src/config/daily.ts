import { SeededRng } from '../core/math/Rng';

/** Режим Daily добавлен в MODES. */
export type DailyModeId = 'daily';

/**
 * Генерирует детерминированный seed на основе календарной даты (UTC).
 * Одинаковый для всех игроков в течение дня.
 */
export function dailySeed(): number {
  const now = new Date();
  const date = now.getUTCFullYear() * 10000 + (now.getUTCMonth() + 1) * 100 + now.getUTCDate();
  // Простой хеш даты через mulberry32
  const rng = new SeededRng(date);
  return rng.int(1, 0x7fffffff);
}

/**
 * Награда за первое прохождение daily-раунда в текущий день.
 * Возвращает 0, если сегодня уже получали награду.
 */
export function dailyReward(todayKey: string): number {
  try {
    const stored = localStorage.getItem('pulsefade:daily');
    if (stored === todayKey) return 0;
  } catch {
    // localStorage недоступен
  }
  // Базовая награда 80-130 pulses
  const rng = new SeededRng(dailySeed());
  return 80 + rng.int(0, 51);
}

/**
 * Бонус за улучшение личного рекорда дня (25-50 pulses).
 */
export function dailyImprovementBonus(): number {
  const rng = new SeededRng(dailySeed());
  return 25 + rng.int(0, 26);
}

/** Сохранить факт получения daily-награды. */
export function claimDailyReward(todayKey: string): void {
  try {
    localStorage.setItem('pulsefade:daily', todayKey);
  } catch {
    // игнорируем ошибки localStorage
  }
}

/** Ключ текущего дня для проверки получения награды. */
export function todayKey(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}-${String(now.getUTCDate()).padStart(2, '0')}`;
}
