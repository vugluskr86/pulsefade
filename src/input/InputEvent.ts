export type InputPhase = 'down' | 'up';

export interface InputEvent {
  readonly phase: InputPhase;
  /** Игровое время события (мс). Берётся между кадрами — точность не теряется. */
  readonly time: number;
  readonly x: number;
  readonly y: number;
  /** Горизонталь в -1..1 — нужна для события «два центра». */
  readonly nx: number;
  readonly pointerId: number;
  consumed: boolean;
}

/** DIP: судья не знает, живой это ввод или запись реплея. */
export interface IInputProvider {
  collect(now: number, out: InputEvent[]): void;
  reset(): void;
}
