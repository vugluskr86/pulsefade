export interface IClock {
  /** Игровое время в мс. Все targetTime импульсов живут в этой шкале. */
  readonly now: number;
  readonly delta: number;
  /** Оценка игрового времени для события, пришедшего между кадрами. */
  project(realNow: number): number;
}

/**
 * Игровые часы с hit-stop.
 * Заморозка останавливает и симуляцию, и визуал, поэтому попадания
 * не «уезжают»: интервалы между импульсами измеряются в этой же шкале.
 */
export class GameClock implements IClock {
  now = 0;
  delta = 0;
  private freezeLeft = 0;
  private lastReal = 0;

  reset(now = 0): void {
    this.now = now;
    this.delta = 0;
    this.freezeLeft = 0;
    this.lastReal = 0;
  }

  advance(realDeltaMs: number, realNow: number): void {
    let dt = realDeltaMs;
    if (this.freezeLeft > 0) {
      const eaten = Math.min(dt, this.freezeLeft);
      this.freezeLeft -= eaten;
      dt -= eaten;
    }
    this.delta = dt;
    this.now += dt;
    this.lastReal = realNow;
  }

  freeze(ms: number): void {
    this.freezeLeft = Math.max(this.freezeLeft, ms);
  }

  get frozen(): boolean {
    return this.freezeLeft > 0;
  }

  project(realNow: number): number {
    if (this.freezeLeft > 0) return this.now;
    return this.now + Math.max(0, realNow - this.lastReal);
  }
}
