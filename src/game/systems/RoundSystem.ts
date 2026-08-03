import type { ISystem } from '../../core/ecs/System';
import { Pulse } from '../components';
import type { GameContext } from '../GameContext';

/** Условия завершения раунда: время, лимит промахов или исчерпанный источник ударов. */
export class RoundSystem implements ISystem {
  readonly name = 'Round';

  update(_dt: number, ctx: GameContext): void {
    const round = ctx.round;
    if (round.ended) return;

    const failLimit = ctx.mode.failAfterMisses;
    if (failLimit !== null && round.misses >= failLimit) {
      this.end(ctx, 'fail');
      return;
    }

    const timeUp =
      round.durationMs !== null && ctx.clock.now >= round.startedAt + round.durationMs;
    if (!timeUp && !round.drained) return;

    // Ждём, пока долетят и разрешатся уже выпущенные кольца.
    for (const [, pulse] of ctx.world.view(Pulse)) {
      if (pulse.state === 'pending') return;
    }

    this.end(ctx, timeUp ? 'time' : ctx.replay ? 'replay-finished' : 'stopped');
  }

  private end(ctx: GameContext, reason: 'time' | 'fail' | 'stopped' | 'replay-finished'): void {
    ctx.round.active = false;
    ctx.round.ended = true;
    ctx.round.reason = reason;
    ctx.bus.emit('roundEnded', { reason });
  }
}
