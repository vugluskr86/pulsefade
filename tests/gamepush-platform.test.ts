import { describe, expect, it, vi } from 'vitest';
import { GAMEPUSH_CONFIG } from '../src/config/gamepush';
import { GamePushPlatform } from '../src/platform/gamepush/GamePushPlatform';
import type { GamePushSdk } from '../src/platform/gamepush/GamePushSdk';

function createSdk() {
  const values = new Map<string, number>([
    ['pulses', 0],
    ['rounds_played', 0],
    ['perfect_hits', 0],
    ['misses_total', 0],
    ['best_combo', 0],
    ['best_adaptive', 0],
  ]);
  const fields = [...values.keys()];
  const events = new Map<string, (...args: unknown[]) => void>();
  const adEvents = new Map<string, (...args: unknown[]) => void>();
  const soundEvents = new Map<string, (...args: unknown[]) => void>();

  const sdk = {
    player: {
      ready: Promise.resolve(),
      score: 0,
      fields,
      get: (key: string) => values.get(key) ?? 0,
      set: (key: string, value: string | number | boolean) => values.set(key, Number(value)),
      add: (key: string, value: number) => values.set(key, (values.get(key) ?? 0) + value),
      sync: vi.fn(async () => undefined),
      on: vi.fn(),
    },
    ads: {
      isFullscreenAvailable: false,
      isRewardedAvailable: true,
      isPreloaderAvailable: false,
      isStickyAvailable: false,
      showFullscreen: vi.fn(async () => true),
      showRewardedVideo: vi.fn(async () => true),
      showPreloader: vi.fn(async () => true),
      showSticky: vi.fn(async () => true),
      closeSticky: vi.fn(),
      on: (name: string, handler: (...args: unknown[]) => void) => adEvents.set(name, handler),
    },
    sounds: {
      isMuted: false,
      isSFXMuted: false,
      isMusicMuted: false,
      on: (name: string, handler: (...args: unknown[]) => void) => soundEvents.set(name, handler),
    },
    leaderboard: { open: vi.fn(async () => undefined) },
    analytics: { goal: vi.fn(), hit: vi.fn() },
    gameStart: vi.fn(async () => undefined),
    gameplayStart: vi.fn(async () => undefined),
    gameplayStop: vi.fn(async () => undefined),
    on: (name: string, handler: (...args: unknown[]) => void) => events.set(name, handler),
  } satisfies GamePushSdk;

  return { sdk, values };
}

describe('GamePushPlatform', () => {
  it('сохраняет статистику и открывает rewarded со второго раунда', async () => {
    const { sdk, values } = createSdk();
    const platform = new GamePushPlatform(sdk, GAMEPUSH_CONFIG);

    platform.recordRound(
      {
        modeId: 'adaptive',
        score: 420,
        bestCombo: 12,
        perfects: 8,
        misses: 1,
        judged: 15,
        reason: 'time',
      },
      4,
    );
    expect(platform.chooseResultMonetization(4)).toBe('none');

    platform.recordRound(
      {
        modeId: 'adaptive',
        score: 500,
        bestCombo: 15,
        perfects: 10,
        misses: 0,
        judged: 16,
        reason: 'time',
      },
      5,
    );

    expect(platform.chooseResultMonetization(5)).toBe('rewarded');
    expect(sdk.player.score).toBe(500);
    expect(values.get('pulses')).toBe(9);
    expect(values.get('rounds_played')).toBe(2);
    expect(values.get('best_combo')).toBe(15);
    expect(sdk.player.sync).toHaveBeenCalledWith({ storage: 'preferred' });
  });

  it('выдаёт дополнительную награду только отдельной операцией', async () => {
    const { sdk, values } = createSdk();
    const platform = new GamePushPlatform(sdk, GAMEPUSH_CONFIG);

    await platform.grantReward(7);

    expect(values.get('pulses')).toBe(7);
    expect(sdk.player.sync).toHaveBeenCalledOnce();
  });
});
