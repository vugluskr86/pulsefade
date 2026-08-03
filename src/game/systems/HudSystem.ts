import type { ISystem } from '../../core/ecs/System';
import { clamp } from '../../core/math/util';
import type { Hud } from '../../ui/Hud';
import type { GameContext } from '../GameContext';

export class HudSystem implements ISystem {
  readonly name = 'Hud';

  constructor(
    private readonly ctx: GameContext,
    private readonly hud: Hud,
  ) {
    hud.setMode(ctx.mode.title.toLowerCase(), ctx.replay);
    hud.resetTape();
    ctx.bus.on('judgement', (event) => {
      if (!event.stray || event.grade !== 'miss') hud.showGrade(event.grade, event.errorMs);
    });
    ctx.bus.on('beatSpawned', ({ beat }) => hud.pushTape(beat.interval, beat.telegraph));
  }

  update(): void {
    const ctx = this.ctx;
    const round = ctx.round;
    const elapsed = ctx.clock.now - round.startedAt;
    const progress =
      round.durationMs === null ? 1 : clamp(1 - elapsed / round.durationMs, 0, 1);

    this.hud.update({
      score: ctx.score.score,
      combo: ctx.score.combo,
      multiplier: ctx.score.multiplier,
      timeLeft: progress,
      timed: round.durationMs !== null,
      tier: ctx.fx.tier,
    });
  }
}
