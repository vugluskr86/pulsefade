import type { GamePushConfig } from '../../config/gamepush';
import { DemoGamePlatform, NullGamePlatform, type IGamePlatform } from '../IGamePlatform';
import { loadGamePushSdk } from './GamePushLoader';
import { GamePushPlatform } from './GamePushPlatform';

/** Локальная разработка и сбой CDN не должны блокировать запуск самой игры. */
export async function createGamePlatform(config: GamePushConfig): Promise<IGamePlatform> {
  if (!config.enabled) return new DemoGamePlatform();
  try {
    const sdk = await loadGamePushSdk(config);
    return sdk ? new GamePushPlatform(sdk, config) : new NullGamePlatform();
  } catch (error) {
    console.warn('[GamePush] SDK initialization failed; continuing without platform services.', error);
    return new NullGamePlatform();
  }
}
