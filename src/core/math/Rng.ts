export interface IRng {
  /** [0, 1) */
  next(): number;
  range(min: number, max: number): number;
  int(minInclusive: number, maxExclusive: number): number;
  pick<T>(items: readonly T[]): T;
  sign(): -1 | 1;
}

/** mulberry32 — детерминированный по seed, нужен для одинаковой дуэли и тестов. */
export class SeededRng implements IRng {
  private state: number;

  constructor(readonly seed: number) {
    this.state = seed >>> 0;
  }

  next(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  int(minInclusive: number, maxExclusive: number): number {
    return Math.floor(this.range(minInclusive, maxExclusive));
  }

  pick<T>(items: readonly T[]): T {
    if (items.length === 0) throw new Error('pick() from empty array');
    return items[this.int(0, items.length)] as T;
  }

  sign(): -1 | 1 {
    return this.next() < 0.5 ? -1 : 1;
  }
}

export function randomSeed(): number {
  return (Math.random() * 0xffffffff) >>> 0;
}
