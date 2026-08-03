export interface GamePushEventSource {
  on(type: string, handler: (...args: unknown[]) => void): void;
  off?(type: string, handler: (...args: unknown[]) => void): void;
}

export interface GamePushPlayerField {
  readonly key?: string;
  readonly name?: string;
}

export type GamePushPlayerFields =
  | readonly (GamePushPlayerField | string)[]
  | Readonly<Record<string, unknown>>
  | null
  | undefined;

export interface GamePushPlayer extends GamePushEventSource {
  readonly ready: Promise<void>;
  score: number;
  readonly fields: GamePushPlayerFields;
  get(key: string): unknown;
  set(key: string, value: string | number | boolean): void;
  add(key: string, value: number): void;
  sync(options?: { readonly storage?: 'preferred' | 'cloud' | 'platform' | 'local' }): Promise<void>;
}

export interface GamePushAds extends GamePushEventSource {
  readonly isFullscreenAvailable: boolean;
  readonly isRewardedAvailable: boolean;
  readonly isPreloaderAvailable: boolean;
  readonly isStickyAvailable: boolean;
  showFullscreen(options?: { readonly showCountdownOverlay?: boolean }): Promise<boolean>;
  showRewardedVideo(): Promise<boolean>;
  showPreloader(): Promise<boolean>;
  showSticky(): Promise<boolean>;
  closeSticky(): void;
}

export interface GamePushSounds extends GamePushEventSource {
  readonly isMuted: boolean;
  readonly isSFXMuted: boolean;
  readonly isMusicMuted: boolean;
}

export interface GamePushLeaderboard {
  open(options?: {
    readonly orderBy?: readonly string[];
    readonly order?: 'ASC' | 'DESC';
    readonly limit?: number;
    readonly withMe?: 'none' | 'first' | 'last';
    readonly showNearest?: number;
    readonly includeFields?: readonly string[];
    readonly displayFields?: readonly string[];
  }): Promise<void>;
}

export interface GamePushAnalytics {
  goal(name: string, value?: string | number): void;
  hit(path: string): void;
}

export interface GamePushSdk extends GamePushEventSource {
  readonly player: GamePushPlayer;
  readonly ads: GamePushAds;
  readonly sounds: GamePushSounds;
  readonly leaderboard: GamePushLeaderboard;
  readonly analytics: GamePushAnalytics;
  gameStart(): Promise<void>;
  gameplayStart(): Promise<void>;
  gameplayStop(): Promise<void>;
}
