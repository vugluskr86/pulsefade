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
import { t, fmt } from '../i18n/locale';
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
  private fullscreenRoundCounter = 0;
  private fullscreenLastTime = 0;
  private sessionCount = 0;
  private firstInputFired = false;
  private firstPerfectFired = false;
  private sessionStartTime = 0;
  private session5Fired = false;
  private session10Fired = false;

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
      onFirstInput: () => {
        this.audio.unlock();
        if (!this.firstInputFired) {
          this.firstInputFired = true;
          this.platform.goal('FIRST_INPUT');
        }
      },
    });
    this.platformMuted = platform.soundMuted;
    this.journey = loadJourneyState();
    this.missions = loadMissionsState();
    this.cosmetics = loadCosmeticState();
    this.audio.setStyle(this.cosmetics.selected.sound);
    this.sessionCount = this.loadSessionCount() + 1;
    this.saveSessionCount();

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

    // Сессионные события
    if (this.sessionStartTime > 0) {
      const elapsed = (real - this.sessionStartTime) / 1000;
      if (!this.session5Fired && elapsed >= 300) {
        this.session5Fired = true;
        this.platform.goal('SESSION_5_MIN');
      }
      if (!this.session10Fired && elapsed >= 600) {
        this.session10Fired = true;
        this.platform.goal('SESSION_10_MIN');
      }
    }

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
      eyebrow: t('pause.eyebrow'),
      title: t('pause.title'),
      note: t('pause.note'),
      actions: [
        { id: 'resume', label: t('pause.resume'), primary: true, hint: t('pause.resumeHint') },
        { id: 'modes', label: t('result.modes') },
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
        visualTheme: this.cosmetics.selected.palette,
        visualBackground: this.cosmetics.selected.background,
        visualTarget: this.cosmetics.selected.target,
        visualParticles: this.cosmetics.selected.particles,
      }),
    );
    this.platform.gameplayStart();
    this.platform.goal('ROUND_START', mode);
    if (this.sessionStartTime === 0) this.sessionStartTime = performance.now();
    if (this.overlay.visible) this.platform.goal('RESULT_VIEW');
    this.platform.goal('AGAIN_CLICK');
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
        visualTheme: this.cosmetics.selected.palette,
        visualBackground: this.cosmetics.selected.background,
        visualTarget: this.cosmetics.selected.target,
        visualParticles: this.cosmetics.selected.particles,
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
    if (!this.firstPerfectFired && summary.perfects > 0) {
      this.firstPerfectFired = true;
      this.platform.goal('FIRST_PERFECT');
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
        eyebrow: t('duel.round1'),
        title: t('duel.player2'),
        note: t('duel.note'),
        stats: this.statsOf(summary),
        actions: [
          { id: 'duel-next', label: t('duel.start'), primary: true, hint: t('pause.resumeHint') },
          { id: 'modes', label: t('result.modes') },
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
      eyebrow: t('duel.result'),
      title: secondWon
        ? t('duel.win2')
        : summary.score === first.score
          ? t('duel.draw')
          : t('duel.win1'),
      duel: {
        left: { name: t('duel.player1'), score: first.score },
        right: { name: t('duel.player2'), score: summary.score },
      },
      stats: [
        { label: fmt('duel.stats.series', { player: 1 }), value: String(first.bestCombo) },
        { label: fmt('duel.stats.series', { player: 2 }), value: String(summary.bestCombo) },
        {
          label: fmt('duel.stats.perfect', { player: 1 }),
          value: `${Math.round(first.perfectRatio * 100)}%`,
        },
        {
          label: fmt('duel.stats.perfect', { player: 2 }),
          value: `${Math.round(summary.perfectRatio * 100)}%`,
        },
      ],
      actions: [
        { id: 'again', label: t('duel.again'), primary: true, hint: t('duel.againHint') },
        { id: 'replay', label: t('duel.replay') },
        ...this.leaderboardActions(),
        { id: 'modes', label: t('duel.modes') },
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
      time: t('result.time'),
      fail: t('result.fail'),
      stopped: t('result.stopped'),
      'replay-finished': t('result.replayFinished'),
    };
    const stats = this.statsOf(summary);
    if (reward > 0) {
      stats.push({
        label: t('result.pulses'),
        value: `+${reward} · ${this.platform.getCurrencyBalance()}`,
      });
    }

    // Ближайшая цель: следующее испытание Journey или рекорд
    const nextTrial = JOURNEY_TRIALS[this.journey.currentIndex];
    const proximityNote =
      nextTrial && this.journey.currentIndex < JOURNEY_TRIALS.length - 1
        ? fmt('journey.result.title', { id: nextTrial.id }) + ': ' + t(nextTrial.titleKey)
        : undefined;

    return {
      eyebrow: t(`mode.${summary.mode.id}`).toLowerCase(),
      title: titles[summary.reason ?? 'time'] ?? t('result.time'),
      note: monetization === 'rewarded' ? t('result.rewardedNote') : proximityNote,
      stats,
      actions: [
        { id: 'again', label: t('result.again'), primary: true, hint: t('result.againHint') },
        ...(monetization === 'rewarded' && reward > 0
          ? [
              {
                id: 'reward-double',
                label: t('result.rewardedBtn'),
                hint: fmt('result.rewardedHint', { reward }),
              },
            ]
          : []),
        ...(streak >= 2
          ? [
              {
                id: 'replay',
                label: t('result.replay'),
                hint: fmt('result.replayHint', { streak }),
              },
            ]
          : []),
        ...this.leaderboardActions(),
        { id: 'modes', label: t('result.modes') },
      ],
    };
  }

  private statsOf(summary: RoundSummary): StatItem[] {
    return [
      { label: t('stats.score'), value: String(summary.score), hot: true },
      { label: t('stats.bestCombo'), value: String(summary.bestCombo) },
      { label: t('stats.perfect'), value: `${Math.round(summary.perfectRatio * 100)}%` },
      { label: t('stats.misses'), value: String(summary.misses) },
    ];
  }

  private leaderboardActions(): ActionItem[] {
    return this.platform.connected
      ? [{ id: 'leaderboard', label: t('result.leaderboard'), hint: t('result.leaderboardHint') }]
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
      label: t('journey.menuLabel'),
      hint: fmt('journey.menuHint', {
        completed: this.journey.trials.filter((t) => t.bestMedal !== 'none').length,
        total: JOURNEY_TRIALS.length,
      }),
    };
    const shopAction: ActionItem = {
      id: 'shop',
      label: t('menu.shop'),
      hint: t('stats.hint'),
    };
    const statsAction: ActionItem = {
      id: 'stats',
      label: t('stats.title'),
      hint: t('stats.hint'),
    };
    this.overlay.showModes(this.mode, [journeyAction, shopAction, statsAction, ...this.leaderboardActions()]);
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
        visualTheme: this.cosmetics.selected.palette,
        visualBackground: this.cosmetics.selected.background,
        visualTarget: this.cosmetics.selected.target,
        visualParticles: this.cosmetics.selected.particles,
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
          label: isNewBest ? t('journey.again') : t('result.again'),
          primary: true,
          hint: isNewBest ? t('journey.againHint') : undefined,
        },
        ...(trialId < JOURNEY_TRIALS.length && medal !== 'none'
          ? [
              {
                id: `journey:${trialId + 1}`,
                label: fmt('journey.next', { id: trialId + 1 }),
                hint: JOURNEY_TRIALS[trialId] ? t(JOURNEY_TRIALS[trialId]!.titleKey) : undefined,
              },
            ]
          : []),
        { id: 'journey-list', label: t('journey.all') },
        { id: 'modes', label: t('result.modes') },
      ],
    );
  }

  private handleAction(id: string): void {
    if (this.actionBusy) return;
    this.breakAdToken += 1;

    if (id.startsWith('mode:')) {
      const mode = id.slice(5) as ModeId;
      this.platform.goal('MODE_SELECT', mode);
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
      case 'stats':
        this.showStats();
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
        note: fmt('result.rewardedGranted', { reward: reward * 2 }),
        stats: this.pendingResults.stats?.map((stat) =>
          stat.label === t('result.pulses')
            ? {
                ...stat,
                value: `+${reward * 2} · ${this.platform.getCurrencyBalance()}`,
              }
            : stat,
        ),
        actions: this.pendingResults.actions.filter((action) => action.id !== 'reward-double'),
      };
    } else {
      this.pendingResults = {
        ...this.pendingResults,
        note: t('result.rewardedFail'),
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
      const names = newlyCompleted.map((m) => t(m.titleKey)).join(', ');
      const reward = newlyCompleted.reduce((sum, m) => sum + m.reward, 0);
      this.pendingResults = {
        ...this.pendingResults,
        note:
          (this.pendingResults.note ?? '') + `\n${fmt('missions.completeNote', { names, reward })}`,
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
          note: fmt('missions.receivedNote', { total: totalReward }),
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
    if (!item) return;
    if (this.cosmetics.owned.includes(item.id)) {
      this.cosmetics = selectCosmetic(this.cosmetics, item.category, item.id);
      saveCosmeticState(this.cosmetics);
      this.applyCosmeticNow(item.category);
      this.showShop();
      return;
    }
    if (!canBuy(item, this.cosmetics, this.platform.getCurrencyBalance())) return;
    this.cosmetics = buyCosmetic(item, this.cosmetics);
    this.cosmetics = selectCosmetic(this.cosmetics, item.category, item.id);
    saveCosmeticState(this.cosmetics);
    this.applyCosmeticNow(item.category);
    this.platform.grantReward(-item.price);
    this.platform.goal('COSMETIC_BUY', item.id);
    this.showShop();
  }

  private applyCosmeticNow(category: CosmeticCategory): void {
    if (category === 'palette') this.runner?.setVisualTheme(this.cosmetics.selected.palette);
    if (category === 'background') this.runner?.setVisualBackground(this.cosmetics.selected.background);
    if (category === 'target') this.runner?.setVisualTarget(this.cosmetics.selected.target);
    if (category === 'particles') this.runner?.setVisualParticles(this.cosmetics.selected.particles);
    if (category === 'sound') this.audio.setStyle(this.cosmetics.selected.sound);
  }

  private showStats(): void {
    this.breakAdToken += 1;
    this.wantsLiveInput = false;
    this.syncInputState();
    this.overlay.showStats(
      this.journey,
      this.missions,
      this.cosmetics,
      this.platform.getCurrencyBalance(),
    );
    this.primaryAction = 'close';
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

    let note = t('daily.done');

    if (baseReward > 0) {
      totalReward += baseReward;
      claimDailyReward(key);
      note += fmt('daily.firstReward', { reward: baseReward });
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
        note += fmt('daily.improved', { bonus });
      } else {
        note += fmt('daily.record', { score: summary.score });
      }
    } else if (baseReward === 0) {
      note += fmt('daily.best', { score: this.dailyBestScore });
    }

    this.platform.recordRound(this.toPlatformRound(summary), totalReward);

    const stats = this.statsOf(summary);
    stats.push(
      { label: t('daily.bestLabel'), value: String(this.dailyBestScore) },
      {
        label: t('result.pulses'),
        value: `+${totalReward} · ${this.platform.getCurrencyBalance()}`,
      },
    );

    this.pendingResults = {
      eyebrow: t('daily.title'),
      title: t('daily.heading'),
      note,
      stats,
      actions: [
        { id: 'again', label: t('result.again'), primary: true, hint: t('result.againHint') },
        ...this.leaderboardActions(),
        { id: 'modes', label: t('result.modes') },
      ],
    };
    this.showPanel(this.pendingResults);
  }

  private loadSessionCount(): number {
    try {
      const stored = localStorage.getItem('pulsefade:session_count');
      return stored ? parseInt(stored, 10) || 0 : 0;
    } catch {
      return 0;
    }
  }

  private saveSessionCount(): void {
    try {
      localStorage.setItem('pulsefade:session_count', String(this.sessionCount));
    } catch {
      /* игнорируем */
    }
  }

  /** GDD §10: одинаковый seed паттернов у обоих игроков. */
  private startDuel(): void {
    const seed = randomSeed();
    this.duel = { seed, first: null, firstRecorder: null };
    this.startRound('duel', seed);
  }
}
