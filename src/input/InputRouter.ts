import type { GameClock } from '../core/time/Clock';
import type { InputEvent, IInputProvider } from './InputEvent';

export interface InputRouterOptions {
  readonly element: HTMLElement;
  readonly clock: GameClock;
  readonly onFirstInput?: () => void;
}

/**
 * Собирает pointer/keyboard в единый поток событий.
 * Одно действие на всю игру (GDD §4), стрелки нужны только для события «два центра».
 */
export class InputRouter implements IInputProvider {
  private readonly queue: InputEvent[] = [];
  private readonly element: HTMLElement;
  private readonly clock: GameClock;
  private readonly onFirstInput?: () => void;
  private greeted = false;
  private enabled = true;
  private readonly keysDown = new Set<string>();

  constructor(options: InputRouterOptions) {
    this.element = options.element;
    this.clock = options.clock;
    this.onFirstInput = options.onFirstInput;

    this.element.addEventListener('pointerdown', this.onPointerDown, { passive: false });
    window.addEventListener('pointerup', this.onPointerUp, { passive: false });
    window.addEventListener('pointercancel', this.onPointerUp, { passive: false });
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.element.addEventListener('contextmenu', this.preventDefault);
    this.element.addEventListener('dblclick', this.preventDefault);
  }

  collect(_now: number, out: InputEvent[]): void {
    if (this.queue.length === 0) return;
    out.push(...this.queue);
    this.queue.length = 0;
  }

  reset(): void {
    this.queue.length = 0;
    this.keysDown.clear();
  }

  /** Блокирует игровой ввод во время паузы, системного оверлея и рекламы. */
  setEnabled(enabled: boolean): void {
    if (this.enabled === enabled) return;
    this.enabled = enabled;
    if (!enabled) this.reset();
  }

  dispose(): void {
    this.element.removeEventListener('pointerdown', this.onPointerDown);
    window.removeEventListener('pointerup', this.onPointerUp);
    window.removeEventListener('pointercancel', this.onPointerUp);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.element.removeEventListener('contextmenu', this.preventDefault);
    this.element.removeEventListener('dblclick', this.preventDefault);
  }

  private preventDefault = (event: Event): void => {
    event.preventDefault();
  };

  private push(phase: 'down' | 'up', x: number, y: number, nx: number, pointerId: number): void {
    if (!this.enabled) return;
    if (!this.greeted) {
      this.greeted = true;
      this.onFirstInput?.();
    }
    this.queue.push({
      phase,
      time: this.clock.project(performance.now()),
      x,
      y,
      nx,
      pointerId,
      consumed: false,
    });
  }

  private onPointerDown = (event: PointerEvent): void => {
    if (event.target !== this.element) return;
    if (!this.enabled) {
      event.preventDefault();
      return;
    }
    event.preventDefault();
    const rect = this.element.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    this.push('down', x, y, (x / Math.max(1, rect.width)) * 2 - 1, event.pointerId);
  };

  private onPointerUp = (event: PointerEvent): void => {
    if (!this.enabled) return;
    const rect = this.element.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    this.push('up', x, y, (x / Math.max(1, rect.width)) * 2 - 1, event.pointerId);
  };

  private keyToSide(code: string): number | null {
    if (code === 'Space' || code === 'Enter' || code === 'KeyJ') return 0;
    if (code === 'ArrowLeft' || code === 'KeyA') return -0.6;
    if (code === 'ArrowRight' || code === 'KeyD') return 0.6;
    return null;
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (!this.enabled) return;
    const side = this.keyToSide(event.code);
    if (side === null || event.repeat) return;
    event.preventDefault();
    this.keysDown.add(event.code);
    const rect = this.element.getBoundingClientRect();
    this.push('down', rect.width * (0.5 + side * 0.5), rect.height * 0.5, side, -1);
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    if (!this.enabled) return;
    const side = this.keyToSide(event.code);
    if (side === null || !this.keysDown.has(event.code)) return;
    this.keysDown.delete(event.code);
    const rect = this.element.getBoundingClientRect();
    this.push('up', rect.width * (0.5 + side * 0.5), rect.height * 0.5, side, -1);
  };
}
