import type { GamePushConfig } from '../../config/gamepush';
import {
  type IGamePlatform,
  type PlatformPauseReason,
  type PlatformRoundResult,
  type ResultMonetization,
} from '../IGamePlatform';
import type { GamePushSdk } from './GamePushSdk';

const OVERALL_LEADERBOARD_MODE = 'adaptive';

type PauseHandler = (reason: PlatformPauseReason) => void;
type SoundHandler = (muted: boolean) => void;

/** Адаптер GamePush: остальная игра не зависит от глобального SDK и его конкретных типов. */
export class GamePushPlatform implements IGamePlatform {
  readonly connected = true;
  private readonly pauseHandlers = new Set<PauseHandler>();
  private readonly resumeHandlers = new Set<PauseHandler>();
  private readonly soundHandlers = new Set<SoundHandler>();
  private sessionRounds = 0;
  private roundsSinceFullscreen = 0;
  private lastFullscreenAt = performance.now();
  private _soundMuted: boolean;

  constructor(
    private readonly gp: GamePushSdk,
    private readonly config: GamePushConfig,
  ) {
    this._soundMuted = gp.sounds.isMuted || gp.sounds.isSFXMuted;
    this.bindSdkEvents();
  }

  get soundMuted(): boolean {
    return this._soundMuted;
  }

  async beforeGameStart(): Promise<void> {
    await this.gp.player.ready;

    if (this.config.showPreloader && this.gp.ads.isPreloaderAvailable) {
      await this.safely(() => this.gp.ads.showPreloader(), false);
    }
    if (this.config.showSticky && this.gp.ads.isStickyAvailable) {
      void this.safely(() => this.gp.ads.showSticky(), false);
    }
  }

  async gameReady(): Promise<void> {
    await this.safely(() => this.gp.gameStart(), undefined);
    this.goal('GAME_READY');
  }

  gameplayStart(): void {
    void this.safely(() => this.gp.gameplayStart(), undefined);
  }

  gameplayStop(): void {
    void this.safely(() => this.gp.gameplayStop(), undefined);
  }

  calculateRoundReward(score: number): number {
    if (score <= 0 || !this.hasField(this.config.fields.currency)) return 0;
    const { rewardScoreDivisor, rewardMin, rewardMax } = this.config.monetization;
    return Math.max(rewardMin, Math.min(rewardMax, Math.floor(score / rewardScoreDivisor)));
  }

  getCurrencyBalance(): number {
    if (!this.hasField(this.config.fields.currency)) return 0;
    try {
      return this.safeNumber(this.gp.player.get(this.config.fields.currency));
    } catch {
      return 0;
    }
  }

  recordRound(result: PlatformRoundResult, reward: number): void {
    this.sessionRounds += 1;
    this.roundsSinceFullscreen += 1;

    this.updateMaximum(this.config.fields.bestByMode[result.modeId], result.score);
    this.updateMaximum(this.config.fields.bestCombo, result.bestCombo);
    this.increment(this.config.fields.roundsPlayed, 1);
    this.increment(this.config.fields.perfectHits, result.perfects);
    this.increment(this.config.fields.missesTotal, result.misses);
    this.increment(this.config.fields.currency, reward);

    if (result.modeId === OVERALL_LEADERBOARD_MODE && result.score > this.safeNumber(this.gp.player.score)) {
      try {
        this.gp.player.score = result.score;
      } catch (error) {
        console.warn('[GamePush] Cannot update base score field.', error);
      }
    }

    this.goal('ROUND_FINISH', result.modeId);
    this.goal('ROUND_SCORE', result.score);
    void this.syncPlayer();
  }

  chooseResultMonetization(reward: number): ResultMonetization {
    const rules = this.config.monetization;
    const fullscreenEligible =
      this.gp.ads.isFullscreenAvailable &&
      this.sessionRounds >= rules.minRoundsBeforeFullscreen &&
      this.roundsSinceFullscreen >= rules.fullscreenEveryRounds &&
      performance.now() - this.lastFullscreenAt >= rules.fullscreenCooldownMs;

    if (fullscreenEligible) return 'fullscreen';
    if (
      reward > 0 &&
      this.gp.ads.isRewardedAvailable &&
      this.sessionRounds >= rules.minRoundsBeforeRewarded
    ) {
      return 'rewarded';
    }
    return 'none';
  }

  async grantReward(amount: number): Promise<void> {
    if (amount <= 0) return;
    this.increment(this.config.fields.currency, amount);
    this.goal('REWARDED_GRANTED', amount);
    await this.syncPlayer();
  }

  async showFullscreen(): Promise<boolean> {
    this.goal('FULLSCREEN_REQUEST');
    const shown = await this.safely(
      () => this.gp.ads.showFullscreen({ showCountdownOverlay: true }),
      false,
    );
    if (shown) {
      this.lastFullscreenAt = performance.now();
      this.roundsSinceFullscreen = 0;
    }
    this.goal(shown ? 'FULLSCREEN_SHOWN' : 'FULLSCREEN_UNAVAILABLE');
    return shown;
  }

  async showRewarded(): Promise<boolean> {
    this.goal('REWARDED_REQUEST');
    const rewarded = await this.safely(() => this.gp.ads.showRewardedVideo(), false);
    this.goal(rewarded ? 'REWARDED_SUCCESS' : 'REWARDED_CANCEL');
    return rewarded;
  }

  async openLeaderboard(): Promise<void> {
    this.goal('LEADERBOARD_OPEN');
    await this.safely(
      () =>
        this.gp.leaderboard.open({
          orderBy: ['score'],
          order: 'DESC',
          limit: 20,
          withMe: 'first',
          showNearest: 3,
        }),
      undefined,
    );
  }

  goal(name: string, value?: string | number): void {
    try {
      this.gp.analytics.goal(name, value);
    } catch {
      // На площадках без подключённого счётчика аналитика является no-op.
    }
  }

  onPause(handler: PauseHandler): () => void {
    this.pauseHandlers.add(handler);
    return () => this.pauseHandlers.delete(handler);
  }

  onResume(handler: PauseHandler): () => void {
    this.resumeHandlers.add(handler);
    return () => this.resumeHandlers.delete(handler);
  }

  onSoundChange(handler: SoundHandler): () => void {
    this.soundHandlers.add(handler);
    return () => this.soundHandlers.delete(handler);
  }

  private bindSdkEvents(): void {
    this.gp.on('pause', () => this.emitPause('gamepush'));
    this.gp.on('resume', () => this.emitResume('gamepush'));
    this.gp.ads.on('start', () => this.emitPause('advertising'));
    this.gp.ads.on('close', () => this.emitResume('advertising'));

    const mute = (): void => this.setSoundMuted(true);
    const unmute = (): void => this.setSoundMuted(this.gp.sounds.isMuted || this.gp.sounds.isSFXMuted);
    this.gp.sounds.on('mute', mute);
    this.gp.sounds.on('mute:sfx', mute);
    this.gp.sounds.on('unmute', unmute);
    this.gp.sounds.on('unmute:sfx', unmute);
  }

  private setSoundMuted(muted: boolean): void {
    if (this._soundMuted === muted) return;
    this._soundMuted = muted;
    for (const handler of this.soundHandlers) handler(muted);
  }

  private emitPause(reason: PlatformPauseReason): void {
    for (const handler of this.pauseHandlers) handler(reason);
  }

  private emitResume(reason: PlatformPauseReason): void {
    for (const handler of this.resumeHandlers) handler(reason);
  }

  private updateMaximum(key: string | undefined, value: number): void {
    if (!key || value <= 0 || !this.hasField(key)) return;
    try {
      const current = this.safeNumber(this.gp.player.get(key));
      if (value > current) this.gp.player.set(key, value);
    } catch (error) {
      console.warn(`[GamePush] Cannot update player field ${key}.`, error);
    }
  }

  private increment(key: string, value: number): void {
    if (value <= 0 || !this.hasField(key)) return;
    try {
      this.gp.player.add(key, value);
    } catch (error) {
      console.warn(`[GamePush] Cannot increment player field ${key}.`, error);
    }
  }

  private hasField(key: string): boolean {
    if (key === 'score') return true;
    const fields = this.gp.player.fields;
    if (Array.isArray(fields)) {
      return fields.some((field) =>
        typeof field === 'string' ? field === key : field.key === key || field.name === key,
      );
    }
    if (fields && typeof fields === 'object') return key in fields;
    // Старые версии SDK могли не отдавать схему полей до fetchFields().
    // В этом случае пробуем запись: GamePush сам отфильтрует неизвестный ключ.
    return true;
  }

  private safeNumber(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : 0;
  }

  private async syncPlayer(): Promise<void> {
    await this.safely(
      () => this.gp.player.sync({ storage: this.config.syncStorage }),
      undefined,
    );
  }

  private async safely<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      console.warn('[GamePush]', error);
      return fallback;
    }
  }
}
