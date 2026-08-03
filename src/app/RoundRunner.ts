import { SystemPipeline } from '../core/ecs/System';
import { World } from '../core/ecs/World';
import { EventBus } from '../core/events/EventBus';
import type { GameClock } from '../core/time/Clock';
import { SeededRng } from '../core/math/Rng';
import type { Tuning } from '../config/Tuning';
import type { ModeDefinition } from '../config/modes';
import type { IBeatSource } from '../domain/Beat';
import { PatternBeatSource } from '../domain/patterns/PatternBeatSource';
import { DefaultScoreRules, accuracyOf, createScoreState } from '../domain/Scoring';
import type { IInputProvider } from '../input/InputEvent';
import type { IRenderer } from '../render/IRenderer';
import type { IAudio } from '../audio/IAudio';
import type { IHaptics } from '../platform/Haptics';
import type { Hud } from '../ui/Hud';
import type { GameContext, GameEvents, RoundEndReason } from '../game/GameContext';
import { createDefaultResolvers } from '../game/resolvers/registry';
import { BeatSpawnSystem } from '../game/systems/BeatSpawnSystem';
import { JudgeSystem } from '../game/systems/JudgeSystem';
import { ScoreSystem } from '../game/systems/ScoreSystem';
import { FeedbackSystem } from '../game/systems/FeedbackSystem';
import { PulseVisualSystem } from '../game/systems/PulseVisualSystem';
import { TargetSystem } from '../game/systems/TargetSystem';
import { ParticleSystem } from '../game/systems/ParticleSystem';
import { TweenSystem } from '../game/systems/TweenSystem';
import { LifetimeSystem } from '../game/systems/LifetimeSystem';
import { BackgroundSystem } from '../game/systems/BackgroundSystem';
import { RenderSystem } from '../game/systems/RenderSystem';
import { HudSystem } from '../game/systems/HudSystem';
import { RoundSystem } from '../game/systems/RoundSystem';
import { RunRecorder } from './RunRecorder';

export interface RunnerDeps {
  readonly renderer: IRenderer;
  readonly hud?: Hud;
  readonly audio: IAudio;
  readonly haptics: IHaptics;
  readonly clock: GameClock;
}

export interface RoundOptions {
  readonly mode: ModeDefinition;
  readonly seed: number;
  readonly tuning: Tuning;
  readonly inputProvider: IInputProvider;
  readonly beatSource?: IBeatSource;
  readonly replay?: boolean;
  readonly durationMs?: number | null;
}

export interface RoundSummary {
  readonly mode: ModeDefinition;
  readonly seed: number;
  readonly score: number;
  readonly bestCombo: number;
  readonly perfectRatio: number;
  readonly perfects: number;
  readonly misses: number;
  readonly judged: number;
  readonly reason: RoundEndReason | null;
}

/**
 * Composition root одного раунда: собирает мир, контекст и конвейер систем.
 * Порядок систем и есть игровой кадр.
 */
export class RoundRunner {
  readonly ctx: GameContext;
  readonly recorder: RunRecorder;
  private readonly pipeline = new SystemPipeline();
  private readonly provider: IInputProvider;

  constructor(
    private readonly deps: RunnerDeps,
    private readonly options: RoundOptions,
  ) {
    const world = new World();
    const bus = new EventBus<GameEvents>();
    const clock = deps.clock;
    const rng = new SeededRng(options.seed);
    const tuning = options.tuning;
    const replay = options.replay ?? false;
    const durationMs =
      options.durationMs !== undefined ? options.durationMs : options.mode.durationMs;

    this.provider = options.inputProvider;
    this.provider.reset();

    this.ctx = {
      world,
      clock,
      bus,
      rng,
      tuning,
      mode: options.mode,
      score: createScoreState(),
      view: { width: 1, height: 1, cx: 0.5, cy: 0.5, unit: 1 },
      round: {
        active: true,
        startedAt: clock.now,
        durationMs: replay ? null : durationMs,
        misses: 0,
        ended: false,
        reason: null,
        drained: false,
      },
      fx: { background: 0, flash: 0, damage: 0, tier: 0 },
      inputs: [],
      replay,
    };

    this.syncView();

    const source =
      options.beatSource ??
      new PatternBeatSource({ rng, mode: options.mode, tuning, startTime: clock.now });

    this.recorder = new RunRecorder(this.ctx);

    this.pipeline.add(
      new BeatSpawnSystem(source),
      new JudgeSystem(createDefaultResolvers()),
      new ScoreSystem(this.ctx, new DefaultScoreRules(tuning.score)),
      new FeedbackSystem(this.ctx, deps.audio, deps.haptics),
      new PulseVisualSystem(),
      new TargetSystem(this.ctx),
      new ParticleSystem(),
      new TweenSystem(),
      new LifetimeSystem(),
      new BackgroundSystem(this.ctx),
      new RenderSystem(deps.renderer),
      new RoundSystem(),
    );

    if (deps.hud) this.pipeline.add(new HudSystem(this.ctx, deps.hud));
  }

  update(dt: number): void {
    this.syncView();
    this.provider.collect(this.ctx.clock.now, this.ctx.inputs);
    // после конца раунда ввод дренируется, но не судится
    if (this.ctx.round.ended) this.ctx.inputs.length = 0;
    this.pipeline.update(dt, this.ctx);
    this.ctx.inputs.length = 0;
  }

  get finished(): boolean {
    return this.ctx.round.ended;
  }

  summary(): RoundSummary {
    const score = this.ctx.score;
    return {
      mode: this.options.mode,
      seed: this.options.seed,
      score: score.score,
      bestCombo: score.bestCombo,
      perfectRatio: accuracyOf(score),
      perfects: score.counts.perfect,
      misses: score.counts.miss,
      judged: score.judged,
      reason: this.ctx.round.reason,
    };
  }

  stop(): void {
    if (this.ctx.round.ended) return;
    this.ctx.round.active = false;
    this.ctx.round.ended = true;
    this.ctx.round.reason = 'stopped';
  }

  dispose(): void {
    this.pipeline.dispose();
    this.ctx.bus.clear();
    this.ctx.world.clear();
  }

  private syncView(): void {
    const { renderer } = this.deps;
    const view = this.ctx.view;
    view.width = renderer.width;
    view.height = renderer.height;
    view.cx = renderer.width / 2;
    view.cy = renderer.height / 2;
    view.unit = Math.min(renderer.width, renderer.height);
  }
}
