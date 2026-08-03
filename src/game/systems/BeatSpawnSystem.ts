import type { ISystem } from '../../core/ecs/System';
import type { Beat, IBeatSource } from '../../domain/Beat';
import { PALETTE, copyColorFrom } from '../colors';
import { SHAPE_RING } from '../../render/IRenderer';
import { LAYOUT } from '../layout';
import { Pulse, Sprite, Transform } from '../components';
import type { GameContext } from '../GameContext';

/** SRP: только рождение импульсов. Источник подменяется (партия/реплей) — DIP. */
export class BeatSpawnSystem implements ISystem {
  readonly name = 'BeatSpawn';
  private pending: Beat | null = null;
  private exhausted = false;

  constructor(private readonly source: IBeatSource) {}

  update(_dt: number, ctx: GameContext): void {
    if (!ctx.round.active) return;
    const endsAt =
      ctx.round.durationMs === null ? Infinity : ctx.round.startedAt + ctx.round.durationMs;

    for (let guard = 0; guard < 16; guard += 1) {
      if (!this.pending) {
        if (this.exhausted) return;
        const beat = this.source.next();
        if (!beat) {
          this.exhausted = true;
          ctx.round.drained = true;
          return;
        }
        this.pending = beat;
      }
      if (this.pending.targetTime > endsAt) {
        this.exhausted = true;
        this.pending = null;
        ctx.round.drained = true;
        return;
      }
      if (ctx.clock.now < this.pending.targetTime - this.pending.approachMs) return;
      this.spawn(ctx, this.pending);
      this.pending = null;
    }
  }

  private spawn(ctx: GameContext, beat: Beat): void {
    const world = ctx.world;
    const entity = world.createEntity();
    const anchorX = beat.kind === 'choice' ? beat.side * LAYOUT.choiceOffset : 0;

    world.add(entity, Transform, {
      x: ctx.view.cx + anchorX * ctx.view.unit,
      y: ctx.view.cy,
    });
    world.add(entity, Sprite, {
      shape: SHAPE_RING,
      radius: LAYOUT.spawnRadius * ctx.view.unit,
      thickness: LAYOUT.ringThickness * ctx.view.unit,
      softness: 1.6,
      color: copyColorFrom(PALETTE.pulse, 0),
      layer: 20,
    });
    world.add(entity, Pulse, {
      beat,
      spawnTime: ctx.clock.now,
      state: 'pending',
      resolvedAt: 0,
      grade: null,
      taps: 0,
      firstTapTime: 0,
      firstGrade: 'ok',
      holdStartedAt: null,
      aux: null,
      anchorX,
    });

    ctx.bus.emit('beatSpawned', { entity, beat });
  }
}
