import type { Grade } from '../domain/Judgement';

export interface IAudio {
  unlock(): void;
  hit(grade: Grade, multiplier: number): void;
  tick(): void;
  setEnabled(enabled: boolean): void;
}

export class NullAudio implements IAudio {
  unlock(): void {}
  hit(): void {}
  tick(): void {}
  setEnabled(): void {}
}
