import { GameClock } from '../core/time/Clock';
import { randomSeed } from '../core/math/Rng';
import { cloneTuning } from '../config/Tuning';
import { MODES, type ModeId } from '../config/modes';
import { RecordedBeatSource } from '../domain/patterns/PatternBeatSource';
import { InputRouter } from '../input/InputRouter';
import { ScriptedInputProvider } from '../input/ScriptedInputProvider';
import { GLRenderer } from '../render/webgl/GLRenderer';
import { WebAudioEngine } from '../audio/WebAudioEngine';
import { VibrationHaptics } from '../platform/Haptics';
import { Hud } from '../ui/Hud';
import { Overlay, type PanelSpec } from '../ui/Overlay';
import { DebugPanel } from '../ui/DebugPanel';
import { RoundRunner, type RoundSummary } from './RoundRunner';
import type { RunRecorder } from './RunRecorder';

export interface ShellElements {
  readonly canvas: HTMLCanvasElement;
  readonly hud: HTMLElement;
  readonly overlay: HTMLElement;
  readonly debug: HTMLElement;
}

const MAX_FRAME_MS = 50;

/**
 * Верхний уровень: жизненный цикл раундов, дуэль, повтор и экраны.
 * Здесь собираются все зависимости — ниже по стеку всё общается через интерфейсы.
 */
export class GameShell {
  private readonly tuning = cloneTuning();
  private readonly clock = new GameClock();
  private readonly renderer: GLRenderer;
  private readonly audio = new WebAudioEngine();
  private readonly haptics = new VibrationHaptics();
  private readonly hud: Hud;
  private readonly overlay: Overlay;
  private readonly debug: DebugPanel;
  private readonly input: InputRouter;

  private runner: RoundRunner | null = null;
  private handledFinish = true;
  private lastReal = 0;
  private mode: ModeId = 'adaptive';
  private replaySource: RunRecorder | null = null;
  private pendingResults: PanelSpec | null = null;
  private primaryAction = 'again';
  private inReplay = false;
  private menuRequested = false;
  private duel: { seed: number; first: RoundSummary | null; firstRecorder: RunRecorder | null } | null =
    null;
  private audioEnabled = true;

  constructor(elements: ShellElements) {
    this.renderer = new GLRenderer(elements.canvas);
    this.hud = new Hud(elements.hud);
    this.overlay = new Overlay(elements.overlay);
    this.debug = new DebugPanel(elements.debug, this.tuning);
    this.input = new InputRouter({
      element: elements.canvas,
      clock: this.clock,
      onFirstInput: () => this.audio.unlock(),
    });

    this.overlay.onAction((id) => this.handleAction(id));
    this.hud.onMenu(() => this.openMenu());

    window.addEventListener('resize', this.onResize);
    window.addEventListener('orientationchange', this.onResize);
    window.addEventListener('keydown', this.onKey);
  }

  /** GDD §3: никаких меню перед первым тапом — сразу летит первое кольцо. */
  start(): void {
    this.startRound('adaptive');
    this.lastReal = performance.now();
    requestAnimationFrame(this.tick);
  }

  private tick = (real: number): void => {
    const delta = Math.min(MAX_FRAME_MS, real - this.lastReal);
    this.lastReal = real;
    this.clock.advance(delta, real);

    if (this.audioEnabled !== this.tuning.audio) {
      this.audioEnabled = this.tuning.audio;
      this.audio.setEnabled(this.audioEnabled);
      this.haptics.setEnabled(this.tuning.haptics);
    }

    const runner = this.runner;
    if (runner) {
      runner.update(this.clock.delta);
      if (runner.finished && !this.handledFinish) {
        this.handledFinish = true;
        this.onFinished(runner);
      }
    }

    requestAnimationFrame(this.tick);
  };

  private onResize = (): void => {
    this.renderer.resize();
  };

  private onKey = (event: KeyboardEvent): void => {
    if (!this.overlay.visible) return;
    if (event.code === 'Space' || event.code === 'Enter') {
      event.preventDefault();
      this.handleAction(this.primaryAction);
    }
  };

  private openMenu(): void {
    this.menuRequested = true;
    this.runner?.stop();
  }

  private startRound(mode: ModeId, seed = randomSeed()): void {
    this.mode = mode;
    this.inReplay = false;
    this.overlay.hide();
    this.hud.resetTape();
    this.swapRunner(
      new RoundRunner(this.deps(), {
        mode: MODES[mode],
        seed,
        tuning: this.tuning,
        inputProvider: this.input,
      }),
    );
  }

  private startReplay(): void {
    const plan = this.replaySource?.buildReplay(this.tuning, this.clock.now);
    if (!plan) return;
    this.inReplay = true;
    this.overlay.hide();
    this.hud.resetTape();
    this.swapRunner(
      new RoundRunner(this.deps(), {
        mode: MODES[this.mode],
        seed: 1,
        tuning: this.tuning,
        replay: true,
        beatSource: new RecordedBeatSource(plan.beats),
        inputProvider: new ScriptedInputProvider(plan.script),
      }),
    );
  }

  private swapRunner(runner: RoundRunner): void {
    this.runner?.dispose();
    this.runner = runner;
    this.handledFinish = false;
  }

  private deps() {
    return {
      renderer: this.renderer,
      hud: this.hud,
      audio: this.audio,
      haptics: this.haptics,
      clock: this.clock,
    };
  }

  private onFinished(runner: RoundRunner): void {
    if (this.inReplay) {
      this.inReplay = false;
      if (this.pendingResults) this.showPanel(this.pendingResults);
      return;
    }

    const summary = runner.summary();
    this.replaySource = runner.recorder;

    if (summary.mode.duel) {
      this.onDuelRoundFinished(summary, runner);
      return;
    }

    this.pendingResults = this.buildResults(summary);
    if (this.menuRequested) {
      this.menuRequested = false;
      this.primaryAction = 'again';
      this.overlay.showModes(this.mode);
      return;
    }
    this.showPanel(this.pendingResults);
  }

  private onDuelRoundFinished(summary: RoundSummary, runner: RoundRunner): void {
    this.menuRequested = false;
    const duel = this.duel;
    if (!duel) return;

    if (duel.first === null) {
      duel.first = summary;
      duel.firstRecorder = runner.recorder;
      this.pendingResults = {
        eyebrow: 'duel · 1 / 2',
        title: 'Игрок 2, ваш ход',
        note: 'Последовательность паттернов будет та же — сравнивается только исполнение.',
        stats: this.statsOf(summary),
        actions: [
          { id: 'duel-next', label: 'Начать', primary: true, hint: 'пробел или тап' },
          { id: 'modes', label: 'Режимы' },
        ],
      };
      this.primaryAction = 'duel-next';
      this.showPanel(this.pendingResults);
      return;
    }

    const first = duel.first;
    const secondWon = summary.score > first.score;
    this.replaySource = secondWon ? runner.recorder : (duel.firstRecorder ?? runner.recorder);

    this.pendingResults = {
      eyebrow: 'duel · итог',
      title: secondWon ? 'Побеждает игрок 2' : summary.score === first.score ? 'Ничья' : 'Побеждает игрок 1',
      duel: {
        left: { name: 'Игрок 1', score: first.score },
        right: { name: 'Игрок 2', score: summary.score },
      },
      stats: [
        { label: 'серия · 1', value: String(first.bestCombo) },
        { label: 'серия · 2', value: String(summary.bestCombo) },
        { label: 'perfect · 1', value: `${Math.round(first.perfectRatio * 100)}%` },
        { label: 'perfect · 2', value: `${Math.round(summary.perfectRatio * 100)}%` },
      ],
      actions: [
        { id: 'again', label: 'Ещё раз', primary: true, hint: 'новый seed' },
        { id: 'replay', label: 'Повтор лучшей серии' },
        { id: 'modes', label: 'Режимы' },
      ],
    };
    this.primaryAction = 'again';
    this.duel = null;
    this.showPanel(this.pendingResults);
  }

  private buildResults(summary: RoundSummary): PanelSpec {
    const streak = this.replaySource?.bestStreak().length ?? 0;
    const titles: Record<string, string> = {
      time: 'Раунд завершён',
      fail: 'Три промаха',
      stopped: 'Остановлено',
      'replay-finished': 'Повтор завершён',
    };
    return {
      eyebrow: summary.mode.title.toLowerCase(),
      title: titles[summary.reason ?? 'time'] ?? 'Раунд завершён',
      stats: this.statsOf(summary),
      actions: [
        { id: 'again', label: 'Ещё раз', primary: true, hint: 'пробел или тап' },
        ...(streak >= 2
          ? [{ id: 'replay', label: 'Повтор лучшей серии', hint: `${streak} ударов подряд` }]
          : []),
        { id: 'modes', label: 'Режимы' },
      ],
    };
  }

  private statsOf(summary: RoundSummary) {
    return [
      { label: 'score', value: String(summary.score), hot: true },
      { label: 'макс. серия', value: String(summary.bestCombo) },
      { label: 'perfect', value: `${Math.round(summary.perfectRatio * 100)}%` },
      { label: 'промахи', value: String(summary.misses) },
    ];
  }

  private showPanel(spec: PanelSpec): void {
    this.primaryAction = spec.actions.find((action) => action.primary)?.id ?? 'again';
    this.overlay.show(spec);
  }

  private handleAction(id: string): void {
    if (id.startsWith('mode:')) {
      const mode = id.slice(5) as ModeId;
      if (mode === 'duel') this.startDuel();
      else this.startRound(mode);
      return;
    }

    switch (id) {
      case 'again':
        if (this.mode === 'duel') this.startDuel();
        else this.startRound(this.mode);
        break;
      case 'replay':
        this.startReplay();
        break;
      case 'modes':
        this.overlay.showModes(this.mode);
        break;
      case 'debug':
        this.debug.toggle(true);
        break;
      case 'duel-next':
        if (this.duel) this.startRound('duel', this.duel.seed);
        break;
      case 'close':
        if (this.pendingResults) this.showPanel(this.pendingResults);
        else this.startRound(this.mode);
        break;
      default:
        break;
    }
  }

  /** GDD §10: одинаковый seed паттернов у обоих игроков. */
  private startDuel(): void {
    const seed = randomSeed();
    this.duel = { seed, first: null, firstRecorder: null };
    this.startRound('duel', seed);
  }
}
