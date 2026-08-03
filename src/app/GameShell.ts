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
import {
  NullGamePlatform,
  type IGamePlatform,
  type PlatformPauseReason,
  type PlatformRoundResult,
  type ResultMonetization,
} from '../platform/IGamePlatform';
import { Hud } from '../ui/Hud';
import { Overlay, type ActionItem, type PanelSpec, type StatItem } from '../ui/Overlay';
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
const FULLSCREEN_RESULT_DELAY_MS = 650;
type PauseReason = PlatformPauseReason | 'visibility';

/**
 * Верхний уровень: жизненный цикл раундов, дуэль, повтор, GamePush и экраны.
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
  private readonly pauseReasons = new Set<PauseReason>();

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
  private wantsLiveInput = false;
  private platformMuted: boolean;
  private audioEnabled = true;
  private hapticsEnabled = true;
  private resultReward = 0;
  private rewardClaimed = false;
  private actionBusy = false;
  private breakAdToken = 0;

  constructor(
    elements: ShellElements,
    private readonly platform: IGamePlatform = new NullGamePlatform(),
  ) {
    this.renderer = new GLRenderer(elements.canvas);
    this.hud = new Hud(elements.hud);
    this.overlay = new Overlay(elements.overlay);
    this.debug = new DebugPanel(elements.debug, this.tuning);
    this.input = new InputRouter({
      element: elements.canvas,
      clock: this.clock,
      onFirstInput: () => this.audio.unlock(),
    });
    this.platformMuted = platform.soundMuted;

    this.overlay.onAction((id) => this.handleAction(id));
    this.hud.onMenu(() => this.openMenu());
    this.platform.onPause((reason) => this.addPause(reason));
    this.platform.onResume((reason) => this.removePause(reason));
    this.platform.onSoundChange((muted) => {
      this.platformMuted = muted;
      this.syncOutputState();
    });

    window.addEventListener('resize', this.onResize);
    window.addEventListener('orientationchange', this.onResize);
    window.addEventListener('keydown', this.onKey);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  /** GDD §3: никаких меню перед первым тапом — сразу летит первое кольцо. */
  start(): void {
    this.startRound('adaptive');
    this.lastReal = performance.now();
    requestAnimationFrame(this.tick);
  }

  private tick = (real: number): void => {
    const delta = Math.min(MAX_FRAME_MS, Math.max(0, real - this.lastReal));
    this.lastReal = real;
    const paused = this.pauseReasons.size > 0;
    this.clock.advance(paused ? 0 : delta, real);
    this.syncOutputState();

    const runner = this.runner;
    if (!paused && runner) {
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

  private onVisibilityChange = (): void => {
    if (document.hidden) {
      if (this.isRoundRunning()) this.addPause('visibility');
      return;
    }

    if (!this.pauseReasons.has('visibility')) return;
    if (!this.isRoundRunning()) {
      this.removePause('visibility');
      return;
    }

    this.showPanel({
      eyebrow: 'пауза',
      title: 'Продолжить раунд',
      note: 'Таймер, импульсы и ввод были остановлены, пока вкладка не была активна.',
      actions: [
        { id: 'resume', label: 'Продолжить', primary: true, hint: 'пробел или тап' },
        { id: 'modes', label: 'Режимы' },
      ],
    });
  };

  private onKey = (event: KeyboardEvent): void => {
    if (!this.overlay.visible || this.actionBusy) return;
    if (event.code === 'Space' || event.code === 'Enter') {
      event.preventDefault();
      this.handleAction(this.primaryAction);
    }
  };

  private openMenu(): void {
    this.breakAdToken += 1;
    this.menuRequested = true;
    this.runner?.stop();
  }

  private startRound(mode: ModeId, seed = randomSeed()): void {
    this.breakAdToken += 1;
    this.mode = mode;
    this.inReplay = false;
    this.menuRequested = false;
    this.pendingResults = null;
    this.resultReward = 0;
    this.rewardClaimed = false;
    this.actionBusy = false;
    this.pauseReasons.delete('visibility');
    this.overlay.hide();
    this.hud.resetTape();
    this.wantsLiveInput = true;
    this.syncInputState();
    this.swapRunner(
      new RoundRunner(this.deps(), {
        mode: MODES[mode],
        seed,
        tuning: this.tuning,
        inputProvider: this.input,
      }),
    );
    this.platform.gameplayStart();
    this.platform.goal('ROUND_START', mode);
  }

  private startReplay(): void {
    const plan = this.replaySource?.buildReplay(this.tuning, this.clock.now);
    if (!plan) return;
    this.breakAdToken += 1;
    this.inReplay = true;
    this.pauseReasons.delete('visibility');
    this.overlay.hide();
    this.hud.resetTape();
    this.wantsLiveInput = false;
    this.syncInputState();
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
    this.platform.goal('REPLAY_START', this.mode);
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
    this.wantsLiveInput = false;
    this.syncInputState();

    if (this.inReplay) {
      this.inReplay = false;
      this.platform.goal('REPLAY_FINISH', this.mode);
      if (this.pendingResults) this.showPanel(this.pendingResults);
      return;
    }

    this.platform.gameplayStop();
    const summary = runner.summary();

    if (this.menuRequested || summary.reason === 'stopped') {
      this.menuRequested = false;
      this.platform.goal('ROUND_ABORT', summary.mode.id);
      this.showModes();
      return;
    }

    this.replaySource = runner.recorder;
    if (summary.mode.duel) {
      this.onDuelRoundFinished(summary, runner);
      return;
    }

    this.resultReward = this.platform.calculateRoundReward(summary.score);
    this.platform.recordRound(this.toPlatformRound(summary), this.resultReward);
    const monetization = this.platform.chooseResultMonetization(this.resultReward);
    this.pendingResults = this.buildResults(summary, this.resultReward, monetization);
    this.showPanel(this.pendingResults);

    if (monetization === 'fullscreen') this.scheduleFullscreenBreak(this.pendingResults);
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
    const winner = secondWon ? summary : first;
    this.platform.recordRound(this.toPlatformRound(winner), 0);
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
        ...this.leaderboardActions(),
        { id: 'modes', label: 'Режимы' },
      ],
    };
    this.primaryAction = 'again';
    this.duel = null;
    this.showPanel(this.pendingResults);
  }

  private buildResults(
    summary: RoundSummary,
    reward: number,
    monetization: ResultMonetization,
  ): PanelSpec {
    const streak = this.replaySource?.bestStreak().length ?? 0;
    const titles: Record<string, string> = {
      time: 'Раунд завершён',
      fail: 'Три промаха',
      stopped: 'Остановлено',
      'replay-finished': 'Повтор завершён',
    };
    const stats = this.statsOf(summary);
    if (reward > 0) {
      stats.push({
        label: 'pulses',
        value: `+${reward} · всего ${this.platform.getCurrencyBalance()}`,
      });
    }

    return {
      eyebrow: summary.mode.title.toLowerCase(),
      title: titles[summary.reason ?? 'time'] ?? 'Раунд завершён',
      note:
        monetization === 'rewarded'
          ? 'Можно удвоить заработанные pulses за просмотр рекламы.'
          : undefined,
      stats,
      actions: [
        { id: 'again', label: 'Ещё раз', primary: true, hint: 'пробел или тап' },
        ...(monetization === 'rewarded' && reward > 0
          ? [
              {
                id: 'reward-double',
                label: '×2 PULSES · РЕКЛАМА',
                hint: `ещё +${reward}`,
              },
            ]
          : []),
        ...(streak >= 2
          ? [{ id: 'replay', label: 'Повтор лучшей серии', hint: `${streak} ударов подряд` }]
          : []),
        ...this.leaderboardActions(),
        { id: 'modes', label: 'Режимы' },
      ],
    };
  }

  private statsOf(summary: RoundSummary): StatItem[] {
    return [
      { label: 'score', value: String(summary.score), hot: true },
      { label: 'макс. серия', value: String(summary.bestCombo) },
      { label: 'perfect', value: `${Math.round(summary.perfectRatio * 100)}%` },
      { label: 'промахи', value: String(summary.misses) },
    ];
  }

  private leaderboardActions(): ActionItem[] {
    return this.platform.connected
      ? [{ id: 'leaderboard', label: 'Таблица лидеров', hint: 'лучшие результаты Adaptive' }]
      : [];
  }

  private showPanel(spec: PanelSpec): void {
    this.wantsLiveInput = false;
    this.syncInputState();
    this.primaryAction = spec.actions.find((action) => action.primary)?.id ?? 'again';
    this.overlay.show(spec);
  }

  private showModes(): void {
    this.breakAdToken += 1;
    this.wantsLiveInput = false;
    this.syncInputState();
    this.overlay.showModes(this.mode, this.leaderboardActions());
    this.primaryAction = 'close';
  }

  private handleAction(id: string): void {
    if (this.actionBusy) return;
    this.breakAdToken += 1;

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
      case 'reward-double':
        void this.claimRewardedDouble();
        break;
      case 'leaderboard':
        void this.openLeaderboard();
        break;
      case 'modes':
        if (this.isRoundRunning()) {
          this.pauseReasons.delete('visibility');
          this.menuRequested = true;
          this.runner?.stop();
        } else {
          this.showModes();
        }
        break;
      case 'resume':
        this.removePause('visibility');
        this.overlay.hide();
        this.wantsLiveInput = !this.inReplay;
        this.syncInputState();
        break;
      case 'debug':
        this.debug.toggle(true);
        break;
      case 'duel-next':
        if (this.duel) this.startRound('duel', this.duel.seed);
        break;
      case 'close':
        if (this.pendingResults) this.showPanel(this.pendingResults);
        else if (this.isRoundRunning()) {
          this.overlay.hide();
          this.wantsLiveInput = !this.inReplay;
          this.syncInputState();
        } else {
          this.startRound(this.mode);
        }
        break;
      default:
        break;
    }
  }

  private async claimRewardedDouble(): Promise<void> {
    if (this.rewardClaimed || this.resultReward <= 0 || !this.pendingResults) return;
    this.actionBusy = true;
    const reward = this.resultReward;
    const shown = await this.platform.showRewarded();

    if (shown) {
      await this.platform.grantReward(reward);
      this.rewardClaimed = true;
      this.pendingResults = {
        ...this.pendingResults,
        note: `Награда удвоена: +${reward * 2} pulses за этот раунд.`,
        stats: this.pendingResults.stats?.map((stat) =>
          stat.label === 'pulses'
            ? {
                ...stat,
                value: `+${reward * 2} · всего ${this.platform.getCurrencyBalance()}`,
              }
            : stat,
        ),
        actions: this.pendingResults.actions.filter((action) => action.id !== 'reward-double'),
      };
    } else {
      this.pendingResults = {
        ...this.pendingResults,
        note: 'Реклама сейчас недоступна или была закрыта. Базовая награда уже сохранена.',
        actions: this.pendingResults.actions.filter((action) => action.id !== 'reward-double'),
      };
    }

    this.actionBusy = false;
    this.showPanel(this.pendingResults);
  }

  private async openLeaderboard(): Promise<void> {
    this.actionBusy = true;
    await this.platform.openLeaderboard();
    this.actionBusy = false;
  }

  private scheduleFullscreenBreak(spec: PanelSpec): void {
    const token = ++this.breakAdToken;
    window.setTimeout(() => {
      if (
        token !== this.breakAdToken ||
        this.pendingResults !== spec ||
        !this.overlay.visible ||
        this.actionBusy
      ) {
        return;
      }
      this.actionBusy = true;
      void this.platform.showFullscreen().finally(() => {
        this.actionBusy = false;
      });
    }, FULLSCREEN_RESULT_DELAY_MS);
  }

  private addPause(reason: PauseReason): void {
    this.pauseReasons.add(reason);
    this.syncInputState();
    this.syncOutputState();
  }

  private removePause(reason: PauseReason): void {
    this.pauseReasons.delete(reason);
    this.syncInputState();
    this.syncOutputState();
  }

  private syncInputState(): void {
    this.input.setEnabled(
      this.wantsLiveInput && this.pauseReasons.size === 0 && !this.overlay.visible,
    );
  }

  private syncOutputState(): void {
    const paused = this.pauseReasons.size > 0;
    const nextAudio = this.tuning.audio && !this.platformMuted && !paused;
    const nextHaptics = this.tuning.haptics && !paused;

    if (this.audioEnabled !== nextAudio) {
      this.audioEnabled = nextAudio;
      this.audio.setEnabled(nextAudio);
    }
    if (this.hapticsEnabled !== nextHaptics) {
      this.hapticsEnabled = nextHaptics;
      this.haptics.setEnabled(nextHaptics);
    }
  }

  private isRoundRunning(): boolean {
    return this.runner !== null && !this.runner.finished && !this.handledFinish;
  }

  private toPlatformRound(summary: RoundSummary): PlatformRoundResult {
    return {
      modeId: summary.mode.id,
      score: summary.score,
      bestCombo: summary.bestCombo,
      perfects: summary.perfects,
      misses: summary.misses,
      judged: summary.judged,
      reason: summary.reason,
    };
  }

  /** GDD §10: одинаковый seed паттернов у обоих игроков. */
  private startDuel(): void {
    const seed = randomSeed();
    this.duel = { seed, first: null, firstRecorder: null };
    this.startRound('duel', seed);
  }
}
