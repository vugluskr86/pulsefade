import { GameClock } from '../core/time/Clock';
import { randomSeed } from '../core/math/Rng';
import { cloneTuning } from '../config/Tuning';
import { MODES, type ModeId } from '../config/modes';
import {
  JOURNEY_TRIALS,
  evaluateMedal,
  updateJourneyProgress,
  loadJourneyState,
  saveJourneyState,
  type JourneyState,
  type Medal,
} from '../config/journey';
import {
  dailySeed,
  dailyReward,
  dailyImprovementBonus,
  claimDailyReward,
  todayKey,
} from '../config/daily';
import {
  WEEKLY_MISSIONS,
  loadMissionsState,
  saveMissionsState,
  updateMissionProgress,
  pendingMissionRewards,
  completedUnclaimedMissions,
  claimMissionReward,
  type MissionsState,
  type MissionDefinition,
  type MissionId,
} from '../config/missions';
import {
  ALL_COSMETICS,
  loadCosmeticState,
  saveCosmeticState,
  canBuy,
  buyCosmetic,
  selectCosmetic,
  type CosmeticState,
  type CosmeticItem,
  type CosmeticCategory,
} from '../config/cosmetics';
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
  private journey: JourneyState;
  private missions: MissionsState;
  private cosmetics: CosmeticState;
  private currentJourneyTrialId: number | null = null;
  private dailyBestScore = 0;
  private duel: {
    seed: number;
    first: RoundSummary | null;
    firstRecorder: RunRecorder | null;
  } | null = null;
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
    this.journey = loadJourneyState();
    this.missions = loadMissionsState();
    this.cosmetics = loadCosmeticState();

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

    if (this.currentJourneyTrialId !== null) {
      this.onJourneyFinished(summary);
      return;
    }

    if (this.mode === 'daily') {
      this.onDailyFinished(summary);
      return;
    }

    if (summary.mode.duel) {
      this.onDuelRoundFinished(summary, runner);
      return;
    }

    this.trackMissionsOnRoundFinished(summary);

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
      title: secondWon
        ? 'Побеждает игрок 2'
        : summary.score === first.score
          ? 'Ничья'
          : 'Побеждает игрок 1',
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
    const journeyAction: ActionItem = {
      id: 'journey-list',
      label: 'Испытания Journey',
      hint: `${this.journey.trials.filter((t) => t.bestMedal !== 'none').length}/${JOURNEY_TRIALS.length} пройдено`,
    };
    this.overlay.showModes(this.mode, [journeyAction, ...this.leaderboardActions()]);
    this.primaryAction = 'close';
  }

  private showJourneyTrials(): void {
    this.breakAdToken += 1;
    this.wantsLiveInput = false;
    this.syncInputState();
    this.overlay.showJourneyTrials(this.journey);
    this.primaryAction = `journey:${JOURNEY_TRIALS[this.journey.currentIndex].id}`;
  }

  private startJourneyTrial(trialId: number): void {
    const trial = JOURNEY_TRIALS[trialId - 1];
    if (!trial) return;

    // Проверяем, что испытание разблокировано
    if (trialId - 1 > this.journey.currentIndex) return;

    this.currentJourneyTrialId = trialId;
    this.breakAdToken += 1;
    this.mode = trial.baseMode;
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

    // Строим ModeDefinition для испытания
    const baseMode = MODES[trial.baseMode];
    const journeyMode = {
      ...baseMode,
      durationMs: trial.durationSec * 1000,
      patternWeights: Object.fromEntries(trial.allowedPatterns.map((p) => [p, 1])),
      eventChance: trial.eventChance,
      eventsFromBeat: trial.eventsFromBeat,
    };

    this.swapRunner(
      new RoundRunner(this.deps(), {
        mode: journeyMode,
        seed: trial.seed,
        tuning: this.tuning,
        inputProvider: this.input,
      }),
    );
    this.platform.gameplayStart();
    this.platform.goal('ROUND_START', trial.baseMode);
  }

  private onJourneyFinished(summary: RoundSummary): void {
    const trialId = this.currentJourneyTrialId;
    this.currentJourneyTrialId = null;
    if (trialId === null) return;

    const trial = JOURNEY_TRIALS[trialId - 1];
    if (!trial) return;

    const medal = evaluateMedal(trial, summary.score, summary.perfectRatio);
    const previousMedal = this.journey.trials[trialId - 1]?.bestMedal ?? 'none';

    this.journey = updateJourneyProgress(
      this.journey,
      trialId,
      summary.score,
      summary.perfectRatio,
    );
    saveJourneyState(this.journey);

    const medalRank: Record<Medal, number> = { none: 0, bronze: 1, silver: 2, gold: 3 };
    const isNewBest = medal !== 'none' && medalRank[medal] > medalRank[previousMedal];

    this.overlay.showJourneyResult(
      trialId,
      medal,
      summary.score,
      summary.perfectRatio,
      previousMedal,
      [
        {
          id: `journey:${trialId}`,
          label: isNewBest ? 'Повторить' : 'Ещё раз',
          primary: true,
          hint: isNewBest ? 'улучшить результат' : undefined,
        },
        ...(trialId < JOURNEY_TRIALS.length && medal !== 'none'
          ? [
              {
                id: `journey:${trialId + 1}`,
                label: `Дальше → #${trialId + 1}`,
                hint: JOURNEY_TRIALS[trialId]?.title,
              },
            ]
          : []),
        { id: 'journey-list', label: 'Все испытания' },
        { id: 'modes', label: 'Режимы' },
      ],
    );
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

    if (id.startsWith('journey:')) {
      const trialId = parseInt(id.slice(8), 10);
      if (!isNaN(trialId)) this.startJourneyTrial(trialId);
      return;
    }

    if (id.startsWith('cosmetic:')) {
      this.handleShopBuy(id.slice(9));
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
      case 'journey-list':
        this.showJourneyTrials();
        break;
      case 'shop':
        this.showShop();
        break;
      case 'missions-list':
        this.showMissionsList();
        break;
      case 'claim-missions':
        this.claimMissionsRewards();
        this.showMissionsList();
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

  private trackMissionsOnRoundFinished(summary: RoundSummary): void {
    const updates: Partial<Record<MissionId, { delta?: number; set?: number }>> = {};

    // perfect_25: считаем PERFECT за раунд
    updates['perfect_25'] = { delta: summary.perfects };

    // combo_20: проверяем, не побит ли рекорд серии
    updates['combo_20'] = { set: summary.bestCombo };

    // flawless: раунд без MISS
    if (summary.misses === 0) updates['flawless'] = { delta: 1 };

    // modes_played: новый уникальный режим (храним отдельно)
    const playedModes = this.getPlayedModes();
    if (!playedModes.has(summary.mode.id)) {
      playedModes.add(summary.mode.id);
      this.savePlayedModes(playedModes);
    }
    updates['modes_3'] = { set: playedModes.size };

    // beat_record: проверяется отдельно в onFinished через platform
    // rounds_5: +1 раунд
    updates['rounds_5'] = { delta: 1 };

    const { state, newlyCompleted } = updateMissionProgress(this.missions, updates);
    this.missions = state;
    saveMissionsState(this.missions);

    // Уведомление о выполненных миссиях
    if (newlyCompleted.length > 0 && this.pendingResults) {
      const names = newlyCompleted.map((m) => m.title).join(', ');
      const reward = newlyCompleted.reduce((sum, m) => sum + m.reward, 0);
      this.pendingResults = {
        ...this.pendingResults,
        note:
          (this.pendingResults.note ?? '') +
          `\n🎯 Миссия выполнена: ${names}. +${reward} pulses. Награда ждёт в миссиях.`,
      };
    }
  }

  private getPlayedModes(): Set<string> {
    try {
      const raw = localStorage.getItem('pulsefade:played_modes');
      return new Set(raw ? JSON.parse(raw) : []);
    } catch {
      return new Set();
    }
  }

  private savePlayedModes(modes: Set<string>): void {
    try {
      localStorage.setItem('pulsefade:played_modes', JSON.stringify([...modes]));
    } catch {
      /* игнорируем */
    }
  }

  private claimMissionsRewards(): void {
    const unclaimed = completedUnclaimedMissions(this.missions);
    let totalReward = 0;
    for (const m of unclaimed) {
      const updated = claimMissionReward(this.missions, m.id);
      if (updated) {
        this.missions = updated;
        totalReward += m.reward;
      }
    }
    if (totalReward > 0) {
      saveMissionsState(this.missions);
      this.platform.grantReward(totalReward);
      if (this.pendingResults) {
        this.pendingResults = {
          ...this.pendingResults,
          note: `Награда за миссии получена: +${totalReward} pulses.`,
        };
      }
    }
  }

  private showShop(): void {
    this.breakAdToken += 1;
    this.wantsLiveInput = false;
    this.syncInputState();
    this.overlay.showCosmetics(this.cosmetics, this.platform.getCurrencyBalance());
    this.primaryAction = 'shop-buy';
  }

  private handleShopBuy(itemId: string): void {
    const item = ALL_COSMETICS.find((c) => c.id === itemId);
    if (!item || !canBuy(item, this.cosmetics, this.platform.getCurrencyBalance())) return;
    this.cosmetics = buyCosmetic(item, this.cosmetics);
    this.cosmetics = selectCosmetic(this.cosmetics, item.category, item.id);
    saveCosmeticState(this.cosmetics);
    this.platform.grantReward(-item.price);
    this.showShop();
  }

  private showMissionsList(): void {
    this.breakAdToken += 1;
    this.wantsLiveInput = false;
    this.syncInputState();
    this.overlay.showMissions(this.missions, pendingMissionRewards(this.missions));
    this.primaryAction = 'claim-missions';
  }

  private startDailyRound(): void {
    const seed = dailySeed();
    this.dailyBestScore = 0;
    try {
      const stored = localStorage.getItem('pulsefade:daily_best');
      if (stored) this.dailyBestScore = parseInt(stored, 10) || 0;
    } catch {
      /* игнорируем */
    }
    this.startRound('daily', seed);
  }

  private onDailyFinished(summary: RoundSummary): void {
    const key = todayKey();
    const baseReward = dailyReward(key);
    let totalReward = this.platform.calculateRoundReward(summary.score);

    let note = 'Ежедневное испытание завершено.';

    if (baseReward > 0) {
      totalReward += baseReward;
      claimDailyReward(key);
      note += ` Первая попытка дня: +${baseReward} pulses.`;
    }

    if (summary.score > this.dailyBestScore) {
      this.dailyBestScore = summary.score;
      try {
        localStorage.setItem('pulsefade:daily_best', String(summary.score));
      } catch {
        /* игнорируем */
      }
      const bonus = dailyImprovementBonus();
      if (baseReward > 0) {
        // Бонус только если это первая попытка (улучшение рекорда в тот же день)
        totalReward += bonus;
        note += ` Рекорд дня улучшен: +${bonus} pulses.`;
      } else {
        note += ` Рекорд дня: ${summary.score}. Награда дня уже получена.`;
      }
    } else if (baseReward === 0) {
      note += ` Лучший результат дня: ${this.dailyBestScore}. Награда дня уже получена.`;
    }

    this.platform.recordRound(this.toPlatformRound(summary), totalReward);

    const stats = this.statsOf(summary);
    stats.push(
      { label: 'рекорд дня', value: String(this.dailyBestScore) },
      { label: 'pulses', value: `+${totalReward} · всего ${this.platform.getCurrencyBalance()}` },
    );

    this.pendingResults = {
      eyebrow: 'daily',
      title: 'Ежедневное испытание',
      note,
      stats,
      actions: [
        { id: 'again', label: 'Ещё раз', primary: true, hint: 'пробел или тап' },
        ...this.leaderboardActions(),
        { id: 'modes', label: 'Режимы' },
      ],
    };
    this.showPanel(this.pendingResults);
  }

  /** GDD §10: одинаковый seed паттернов у обоих игроков. */
  private startDuel(): void {
    const seed = randomSeed();
    this.duel = { seed, first: null, firstRecorder: null };
    this.startRound('duel', seed);
  }
}
