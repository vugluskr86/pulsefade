import type { Grade } from '../domain/Judgement';

export type SoundSetId = 'sound_default' | 'sound_chime' | 'sound_techno';

export interface IAudio {
  unlock(): void;
  hit(grade: Grade, multiplier: number): void;
  tick(): void;
  setEnabled(enabled: boolean): void;
  /** Косметический набор откликов из магазина. */
  setStyle(style: string): void;
}

export class NullAudio implements IAudio {
  unlock(): void {}
  hit(): void {}
  tick(): void {}
  setEnabled(): void {}
  setStyle(): void {}
}
