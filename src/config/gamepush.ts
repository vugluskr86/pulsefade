export interface GamePushFieldsConfig {
  readonly currency: string;
  readonly roundsPlayed: string;
  readonly perfectHits: string;
  readonly missesTotal: string;
  readonly bestCombo: string;
  readonly bestByMode: Readonly<Record<string, string>>;
}

export interface GamePushMonetizationConfig {
  /** Первые результаты полностью без рекламы — игрок должен понять механику. */
  readonly minRoundsBeforeRewarded: number;
  /** Полноэкранная реклама появляется только после нескольких раундов. */
  readonly minRoundsBeforeFullscreen: number;
  /** Дополнительный локальный лимит поверх лимитов GamePush/площадки. */
  readonly fullscreenCooldownMs: number;
  /** Не чаще одного полноэкранного показа на N завершённых раундов. */
  readonly fullscreenEveryRounds: number;
  readonly rewardScoreDivisor: number;
  readonly rewardMin: number;
  readonly rewardMax: number;
}

export interface GamePushConfig {
  readonly enabled: boolean;
  readonly projectId: number | null;
  readonly publicToken: string;
  readonly sdkAttemptTimeoutMs: number;
  /** Для PULSEFADE выключено: первый игровой импульс важнее стартовой рекламы. */
  readonly showPreloader: boolean;
  /** Sticky перекрывает полноэкранное ритм-поле, поэтому по умолчанию выключен. */
  readonly showSticky: boolean;
  readonly syncStorage: 'preferred' | 'cloud' | 'platform' | 'local';
  readonly fields: GamePushFieldsConfig;
  readonly monetization: GamePushMonetizationConfig;
}

type ViteLikeEnv = Readonly<Record<string, string | boolean | undefined>>;

function readEnv(): ViteLikeEnv {
  return ((import.meta as ImportMeta & { readonly env?: ViteLikeEnv }).env ?? {}) as ViteLikeEnv;
}

function parseBoolean(value: string | boolean | undefined, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (value === undefined) return fallback;
  return value === '1' || value.toLowerCase() === 'true' || value.toLowerCase() === 'yes';
}

function parseProjectId(value: string | boolean | undefined): number | null {
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

const env = readEnv();
const projectId = parseProjectId(env.VITE_GAMEPUSH_PROJECT_ID);
const publicToken =
  typeof env.VITE_GAMEPUSH_PUBLIC_TOKEN === 'string' ? env.VITE_GAMEPUSH_PUBLIC_TOKEN.trim() : '';

export const GAMEPUSH_CONFIG: GamePushConfig = {
  enabled: parseBoolean(env.VITE_GAMEPUSH_ENABLED, projectId !== null && publicToken.length > 0),
  projectId,
  publicToken,
  sdkAttemptTimeoutMs: 8_000,
  showPreloader: parseBoolean(env.VITE_GAMEPUSH_PRELOADER, false),
  showSticky: parseBoolean(env.VITE_GAMEPUSH_STICKY, false),
  syncStorage: 'preferred',
  fields: {
    currency: 'pulses',
    roundsPlayed: 'rounds_played',
    perfectHits: 'perfect_hits',
    missesTotal: 'misses_total',
    bestCombo: 'best_combo',
    bestByMode: {
      adaptive: 'best_adaptive',
      chaos: 'best_chaos',
      marathon: 'best_marathon',
      zen: 'best_zen',
      duel: 'best_duel',
    },
  },
  monetization: {
    minRoundsBeforeRewarded: 2,
    minRoundsBeforeFullscreen: 4,
    fullscreenCooldownMs: 180_000,
    fullscreenEveryRounds: 3,
    rewardScoreDivisor: 100,
    rewardMin: 1,
    rewardMax: 250,
  },
};
