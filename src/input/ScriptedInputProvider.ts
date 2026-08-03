import type { InputEvent, IInputProvider } from './InputEvent';

export interface ScriptedInput {
  readonly phase: 'down' | 'up';
  readonly time: number;
  readonly nx: number;
  readonly x: number;
  readonly y: number;
}

/**
 * Воспроизводит записанные тапы с их точным временем, поэтому оценки в реплее
 * совпадают с оригиналом до миллисекунды (GDD §11 — повтор лучшей серии).
 */
export class ScriptedInputProvider implements IInputProvider {
  private cursor = 0;

  constructor(private readonly script: readonly ScriptedInput[]) {}

  collect(now: number, out: InputEvent[]): void {
    while (this.cursor < this.script.length) {
      const item = this.script[this.cursor] as ScriptedInput;
      if (item.time > now) break;
      this.cursor += 1;
      out.push({
        phase: item.phase,
        time: item.time,
        x: item.x,
        y: item.y,
        nx: item.nx,
        pointerId: -2,
        consumed: false,
      });
    }
  }

  reset(): void {
    this.cursor = 0;
  }
}
