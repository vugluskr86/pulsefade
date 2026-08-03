export type PlatformPauseReason = 'gamepush' | 'advertising';
export type ResultMonetization = 'none' | 'rewarded' | 'fullscreen';

export interface PlatformRoundResult {
  readonly modeId: string;
  readonly score: number;
  readonly bestCombo: number;
  readonly perfects: number;
  readonly misses: number;
  readonly judged: number;
  readonly reason: string | null;
}

export interface IGamePlatform {
  readonly connected: boolean;
  readonly soundMuted: boolean;

  beforeGameStart(): Promise<void>;
  gameReady(): Promise<void>;
  gameplayStart(): void;
  gameplayStop(): void;

  calculateRoundReward(score: number): number;
  getCurrencyBalance(): number;
  recordRound(result: PlatformRoundResult, reward: number): void;
  chooseResultMonetization(reward: number): ResultMonetization;
  grantReward(amount: number): Promise<void>;

  showFullscreen(): Promise<boolean>;
  showRewarded(): Promise<boolean>;
  openLeaderboard(): Promise<void>;
  goal(name: string, value?: string | number): void;

  onPause(handler: (reason: PlatformPauseReason) => void): () => void;
  onResume(handler: (reason: PlatformPauseReason) => void): () => void;
  onSoundChange(handler: (muted: boolean) => void): () => void;
}

export class NullGamePlatform implements IGamePlatform {
  readonly connected = false;
  readonly soundMuted = false;

  async beforeGameStart(): Promise<void> {}
  async gameReady(): Promise<void> {}
  gameplayStart(): void {}
  gameplayStop(): void {}
  calculateRoundReward(): number {
    return 0;
  }
  getCurrencyBalance(): number {
    return 0;
  }
  recordRound(): void {}
  chooseResultMonetization(): ResultMonetization {
    return 'none';
  }
  async grantReward(): Promise<void> {}
  async showFullscreen(): Promise<boolean> {
    return false;
  }
  async showRewarded(): Promise<boolean> {
    return false;
  }
  async openLeaderboard(): Promise<void> {}
  goal(): void {}
  onPause(): () => void {
    return () => {};
  }
  onResume(): () => void {
    return () => {};
  }
  onSoundChange(): () => void {
    return () => {};
  }
}
