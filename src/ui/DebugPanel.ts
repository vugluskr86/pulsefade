import type { Tuning } from '../config/Tuning';

interface SliderSpec {
  label: string;
  min: number;
  max: number;
  step: number;
  get(tuning: Tuning): number;
  set(tuning: Tuning, value: number): void;
}

const SLIDERS: SliderSpec[] = [
  {
    label: 'perfect ±',
    min: 15,
    max: 90,
    step: 1,
    get: (t) => t.windows.perfect,
    set: (t, v) => {
      t.windows.perfect = v;
    },
  },
  {
    label: 'great ±',
    min: 40,
    max: 160,
    step: 1,
    get: (t) => t.windows.great,
    set: (t, v) => {
      t.windows.great = v;
    },
  },
  {
    label: 'ok ±',
    min: 80,
    max: 260,
    step: 1,
    get: (t) => t.windows.ok,
    set: (t, v) => {
      t.windows.ok = v;
    },
  },
  {
    label: 'hit-stop',
    min: 0,
    max: 60,
    step: 1,
    get: (t) => t.hitstop.perfect,
    set: (t, v) => {
      t.hitstop.perfect = v;
    },
  },
  {
    label: '2× окно',
    min: 120,
    max: 400,
    step: 5,
    get: (t) => t.doubleTapWindowMs,
    set: (t, v) => {
      t.doubleTapWindowMs = v;
    },
  },
  {
    label: 'удержание',
    min: 200,
    max: 900,
    step: 10,
    get: (t) => t.holdDurationMs,
    set: (t, v) => {
      t.holdDurationMs = v;
    },
  },
  {
    label: 'подлёт мин',
    min: 180,
    max: 600,
    step: 10,
    get: (t) => t.minApproachMs,
    set: (t, v) => {
      t.minApproachMs = v;
    },
  },
];

/** GDD §5: значения должны настраиваться без пересборки. Клавиша ` или пункт меню. */
export class DebugPanel {
  private open = false;

  constructor(
    private readonly root: HTMLElement,
    private readonly tuning: Tuning,
  ) {
    this.build();
    window.addEventListener('keydown', (event) => {
      if (event.code === 'Backquote') this.toggle();
    });
  }

  toggle(force?: boolean): void {
    this.open = force ?? !this.open;
    this.root.hidden = !this.open;
  }

  private build(): void {
    const title = document.createElement('h4');
    title.textContent = 'баланс';
    this.root.append(title);

    for (const slider of SLIDERS) {
      const label = document.createElement('label');
      const name = document.createElement('span');
      name.textContent = slider.label;
      const input = document.createElement('input');
      input.type = 'range';
      input.min = String(slider.min);
      input.max = String(slider.max);
      input.step = String(slider.step);
      input.value = String(slider.get(this.tuning));
      const value = document.createElement('span');
      value.textContent = String(slider.get(this.tuning));
      input.addEventListener('input', () => {
        const parsed = Number(input.value);
        slider.set(this.tuning, parsed);
        value.textContent = String(parsed);
      });
      label.append(name, input, value);
      this.root.append(label);
    }

    this.root.append(this.toggleRow('звук', (on) => (this.tuning.audio = on), this.tuning.audio));
    this.root.append(
      this.toggleRow('вибро', (on) => (this.tuning.haptics = on), this.tuning.haptics),
    );
    this.root.append(
      this.toggleRow(
        'штраф за лишний тап',
        (on) => (this.tuning.strayTapPenalty = on),
        this.tuning.strayTapPenalty,
      ),
    );
  }

  private toggleRow(label: string, apply: (on: boolean) => void, initial: boolean): HTMLElement {
    const row = document.createElement('label');
    const name = document.createElement('span');
    name.textContent = label;
    const input = document.createElement('input');
    input.type = 'checkbox';
    input.checked = initial;
    input.addEventListener('change', () => apply(input.checked));
    const spacer = document.createElement('span');
    row.append(name, input, spacer);
    return row;
  }
}
