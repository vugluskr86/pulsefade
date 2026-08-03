import type { ISystem } from '../../core/ecs/System';
import { Pulse } from '../components';
import type { GameContext } from '../GameContext';
import type { BeatResolverRegistry } from '../resolvers/registry';

/**
 * Судья не знает про конкретные типы событий: он раздаёт импульсы резолверам,
 * а затем наказывает нажатия, не попавшие ни в одно окно (GDD §5, «остальное — MISS»).
 */
export class JudgeSystem implements ISystem {
  readonly name = 'Judge';
  private lastAcceptedTap = -Infinity;

  constructor(private readonly resolvers: BeatResolverRegistry) {}

  update(_dt: number, ctx: GameContext): void {
    const now = ctx.clock.now;

    const entities = ctx.world.query(Pulse);
    entities.sort((a, b) => {
      const left = ctx.world.require(a, Pulse).beat.targetTime;
      const right = ctx.world.require(b, Pulse).beat.targetTime;
      return left - right;
    });

    for (const entity of entities) {
      const pulse = ctx.world.require(entity, Pulse);
      if (pulse.state === 'resolved') continue;
      this.resolvers.get(pulse.beat.kind).resolve({ ctx, entity, pulse, now });
    }

    for (const event of ctx.inputs) {
      if (event.consumed) {
        if (event.phase === 'down') this.lastAcceptedTap = event.time;
        continue;
      }
      if (event.phase !== 'down') continue;
      if (!ctx.tuning.strayTapPenalty) continue;
      if (event.time - this.lastAcceptedTap < ctx.tuning.strayDebounceMs) continue;
      this.lastAcceptedTap = event.time;
      ctx.bus.emit('judgement', {
        grade: 'miss',
        errorMs: ctx.tuning.windows.ok + 1,
        kind: 'tap',
        beatIndex: -1,
        targetTime: event.time,
        hitTime: event.time,
        x: event.x,
        y: event.y,
        stray: true,
      });
    }
  }
}
