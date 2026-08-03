import { describe, expect, it } from 'vitest';
import { GameClock } from '../src/core/time/Clock';
import { cloneTuning } from '../src/config/Tuning';
import { MODES } from '../src/config/modes';
import { NullAudio } from '../src/audio/IAudio';
import type { IHaptics } from '../src/platform/Haptics';
import type { DrawCommand, IRenderer } from '../src/render/IRenderer';
import type { IInputProvider, InputEvent } from '../src/input/InputEvent';
import { Particle, Pulse } from '../src/game/components';
import type { GameContext } from '../src/game/GameContext';
import { RoundRunner } from '../src/app/RoundRunner';

class StubRenderer implements IRenderer {
  readonly width = 800;
  readonly height = 600;
  readonly pixelRatio = 1;
  draws = 0;
  resize(): void {}
  beginFrame(): void {
    this.draws = 0;
  }
  draw(_command: DrawCommand): void {
    this.draws += 1;
  }
  endFrame(): void {}
  dispose(): void {}
}

class SilentHaptics implements IHaptics {
  pulse(): void {}
  setEnabled(): void {}
}

class NoInput implements IInputProvider {
  collect(): void {}
  reset(): void {}
}

const tuning = cloneTuning();

const event = (phase: 'down' | 'up', time: number, nx: number): InputEvent => ({
  phase,
  time,
  x: 400,
  y: 300,
  nx,
  pointerId: -3,
  consumed: false,
});

/** Бот, попадающий ровно в targetTime — эталон для проверки всех типов событий. */
class PerfectBot implements IInputProvider {
  private readonly stage = new Map<number, number>();

  constructor(private readonly getContext: () => GameContext) {}

  collect(now: number, out: InputEvent[]): void {
    const ctx = this.getContext();
    for (const [, pulse] of ctx.world.view(Pulse)) {
      if (pulse.state !== 'pending') continue;
      const beat = pulse.beat;
      const nx = beat.kind === 'choice' ? beat.side * 0.6 : 0;
      const stage = this.stage.get(beat.index) ?? 0;

      if (stage === 0) {
        if (now < beat.targetTime) continue;
        out.push(event('down', beat.targetTime, nx));
        if (beat.kind === 'tap' || beat.kind === 'choice') {
          out.push(event('up', beat.targetTime + 30, nx));
        }
        this.stage.set(beat.index, 1);
        continue;
      }

      if (stage === 1 && beat.kind === 'double') {
        const second = beat.targetTime + tuning.doubleTapWindowMs * 0.6;
        if (now < second) continue;
        out.push(event('down', second, nx));
        out.push(event('up', second + 30, nx));
        this.stage.set(beat.index, 2);
        continue;
      }

      if (stage === 1 && beat.kind === 'hold') {
        const release = beat.targetTime + tuning.holdDurationMs;
        if (now < release) continue;
        out.push(event('up', release, nx));
        this.stage.set(beat.index, 2);
      }
    }
  }

  reset(): void {
    this.stage.clear();
  }
}

function runRound(mode = MODES.chaos, seed = 4242, bot = true) {
  const renderer = new StubRenderer();
  const clock = new GameClock();
  let runner: RoundRunner;
  const provider: IInputProvider = bot ? new PerfectBot(() => runner.ctx) : new NoInput();

  runner = new RoundRunner(
    { renderer, hud: undefined, audio: new NullAudio(), haptics: new SilentHaptics(), clock },
    { mode, seed, tuning, inputProvider: provider },
  );

  let real = 0;
  const step = () => {
    real += 1000 / 60;
    clock.advance(1000 / 60, real);
    runner.update(clock.delta);
  };
  for (let frame = 0; frame < 6000 && !runner.finished; frame += 1) step();
  return { runner, renderer, step };
}

describe('раунд целиком', () => {
  it('идеальный бот проходит Chaos без промахов', () => {
    const { runner, renderer } = runRound();
    const summary = runner.summary();

    expect(runner.finished).toBe(true);
    expect(summary.reason).toBe('time');
    expect(summary.judged).toBeGreaterThan(20);
    expect(summary.misses).toBe(0);
    expect(summary.perfectRatio).toBe(1);
    expect(summary.bestCombo).toBe(summary.judged);
    expect(summary.score).toBeGreaterThan(0);
    expect(renderer.draws).toBeGreaterThan(0);
  });

  it('множитель доводится до потолка на длинной серии', () => {
    const { runner } = runRound();
    expect(runner.ctx.score.multiplier).toBe(tuning.score.maxMultiplier);
    expect(runner.ctx.fx.tier).toBe(3);
  });

  it('без ввода всё считается промахом, счёт остаётся нулевым', () => {
    const { runner } = runRound(MODES.adaptive, 99, false);
    const summary = runner.summary();
    expect(summary.judged).toBeGreaterThan(20);
    expect(summary.misses).toBe(summary.judged);
    expect(summary.score).toBe(0);
    expect(summary.bestCombo).toBe(0);
  });

  it('Marathon завершается по лимиту промахов', () => {
    const { runner } = runRound(MODES.marathon, 7, false);
    expect(runner.summary().reason).toBe('fail');
    expect(runner.summary().misses).toBe(MODES.marathon.failAfterMisses);
  });

  it('сущности не утекают: кольца и частицы исчезают после раунда', () => {
    const { runner, step } = runRound();
    expect(runner.ctx.world.countOf(Particle)).toBeLessThanOrEqual(tuning.particleBudget);
    for (let frame = 0; frame < 90; frame += 1) step();
    expect(runner.ctx.world.countOf(Pulse)).toBe(0);
    expect(runner.ctx.world.countOf(Particle)).toBe(0);
  });

  it('повтор лучшей серии воспроизводит те же оценки', () => {
    const { runner } = runRound();
    const plan = runner.recorder.buildReplay(tuning, 0);
    expect(plan).not.toBeNull();
    expect(plan!.length).toBe(runner.summary().bestCombo);
    expect(plan!.beats.length).toBe(plan!.length);
    expect(plan!.script.length).toBeGreaterThanOrEqual(plan!.length * 2);
  });
});
