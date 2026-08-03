import type { Telegraph } from '../domain/Beat';
import type { Grade } from '../domain/Judgement';

export interface HudState {
  score: number;
  combo: number;
  multiplier: number;
  /** 1 — начало раунда, 0 — конец. */
  timeLeft: number;
  timed: boolean;
  tier: 0 | 1 | 2 | 3;
}

const TAPE_LENGTH = 8;
const MIN_TICK = 4;
const MAX_TICK = 26;

/** Тонкий слой над DOM: цифры остаются чёткими, вся графика — в WebGL. */
export class Hud {
  private readonly scoreEl: HTMLElement;
  private readonly multiplierEl: HTMLElement;
  private readonly comboEl: HTMLElement;
  private readonly timeEl: HTMLElement;
  private readonly timeBar: HTMLElement;
  private readonly gradeEl: HTMLElement;
  private readonly modeEl: HTMLElement;
  private readonly tapeEl: HTMLElement;
  private readonly menuButton: HTMLElement;
  private lastScore = -1;
  private lastCombo = -1;
  private lastMultiplier = -1;

  constructor(private readonly root: HTMLElement) {
    this.scoreEl = this.pick('score');
    this.multiplierEl = this.pick('multiplier');
    this.comboEl = this.pick('combo');
    this.timeEl = this.pick('time');
    this.gradeEl = this.pick('grade');
    this.modeEl = this.pick('mode');
    this.tapeEl = this.pick('tape');
    this.menuButton = this.pick('menu');
    this.timeBar = this.timeEl.parentElement as HTMLElement;
  }

  onMenu(handler: () => void): void {
    this.menuButton.addEventListener('click', handler);
  }

  setVisible(visible: boolean): void {
    this.root.style.opacity = visible ? '1' : '0';
  }

  setMode(title: string, replay: boolean): void {
    this.modeEl.textContent = replay ? `${title} · повтор` : title;
  }

  update(state: HudState): void {
    if (state.score !== this.lastScore) {
      this.scoreEl.textContent = String(state.score);
      this.lastScore = state.score;
    }
    if (state.multiplier !== this.lastMultiplier) {
      this.multiplierEl.textContent = `×${state.multiplier}`;
      this.lastMultiplier = state.multiplier;
    }
    if (state.combo !== this.lastCombo) {
      this.comboEl.textContent = state.combo >= 2 ? `combo ${state.combo}` : '';
      this.comboEl.classList.toggle('combo--hot', state.tier >= 2);
      this.lastCombo = state.combo;
    }
    this.timeEl.style.transform = `scaleX(${state.timed ? state.timeLeft : 1})`;
    this.timeBar.classList.toggle('timebar--warn', state.timed && state.timeLeft < 0.2);
  }

  showGrade(grade: Grade, errorMs: number): void {
    const rounded = Math.round(errorMs);
    const detail =
      grade === 'perfect' || grade === 'miss'
        ? ''
        : ` ${rounded > 0 ? '+' : ''}${rounded}`;
    this.gradeEl.textContent = `${grade}${detail}`;
    this.gradeEl.style.color =
      grade === 'perfect'
        ? 'var(--ember)'
        : grade === 'great'
          ? 'var(--mint)'
          : grade === 'ok'
            ? 'var(--pulse)'
            : 'var(--rose)';
    this.gradeEl.removeAttribute('data-show');
    void this.gradeEl.offsetWidth; // перезапуск анимации
    this.gradeEl.setAttribute('data-show', '1');
  }

  /** Лента темпа: последние интервалы шириной штриха — смена темпа видна глазом. */
  pushTape(intervalMs: number, telegraph: Telegraph): void {
    const tick = document.createElement('i');
    const clamped = Math.max(180, Math.min(1400, intervalMs));
    const width = MIN_TICK + ((clamped - 180) / (1400 - 180)) * (MAX_TICK - MIN_TICK);
    tick.style.width = `${width.toFixed(1)}px`;
    tick.dataset.t = telegraph;
    this.tapeEl.appendChild(tick);
    while (this.tapeEl.childElementCount > TAPE_LENGTH) {
      this.tapeEl.removeChild(this.tapeEl.firstElementChild as Element);
    }
  }

  resetTape(): void {
    this.tapeEl.replaceChildren();
    this.lastScore = -1;
    this.lastCombo = -1;
    this.lastMultiplier = -1;
    this.comboEl.textContent = '';
  }

  private pick(name: string): HTMLElement {
    const element = this.root.querySelector<HTMLElement>(`[data-hud="${name}"]`);
    if (!element) throw new Error(`HUD element "${name}" not found`);
    return element;
  }
}
