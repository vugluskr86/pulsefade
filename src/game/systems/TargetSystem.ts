import type { ISystem } from '../../core/ecs/System';
import { damp } from '../../core/math/util';
import { SHAPE_GLOW, SHAPE_RING } from '../../render/IRenderer';
import { Pulse, Sprite, Target, Transform } from '../components';
import { PALETTE, copyColorFrom } from '../colors';
import { LAYOUT } from '../layout';
import type { GameContext } from '../GameContext';

/** Центральная мишень и два дополнительных центра для события «choice». */
export class TargetSystem implements ISystem {
  readonly name = 'Target';

  constructor(ctx: GameContext) {
    this.spawn(ctx, 'center', 0, 1);
    this.spawn(ctx, 'left', -LAYOUT.choiceOffset, 0);
    this.spawn(ctx, 'right', LAYOUT.choiceOffset, 0);
  }

  update(dt: number, ctx: GameContext): void {
    const unit = ctx.view.unit;
    const choiceSide = this.pendingChoiceSide(ctx);

    for (const [entity, target] of ctx.world.view(Target)) {
      const transform = ctx.world.require(entity, Transform);
      const sprite = ctx.world.require(entity, Sprite);
      const offset =
        target.role === 'left'
          ? -LAYOUT.choiceOffset
          : target.role === 'right'
            ? LAYOUT.choiceOffset
            : 0;

      transform.x = ctx.view.cx + offset * unit;
      transform.y = ctx.view.cy;

      const wanted =
        target.role === 'center'
          ? choiceSide === null
            ? 1
            : 0.18
          : choiceSide === null
            ? 0
            : (target.role === 'left' ? -1 : 1) === choiceSide
              ? 1
              : 0.3;

      target.visibility = damp(target.visibility, wanted, 14, dt);
      target.kick = damp(target.kick, 0, 9, dt);

      sprite.radius = LAYOUT.targetRadius * unit * (1 + target.kick * 0.09);
      sprite.thickness = LAYOUT.targetThickness * unit * (1 + target.kick * 1.6);
      sprite.color[3] = target.visibility * (0.32 + target.kick * 0.6);
    }
  }

  private pendingChoiceSide(ctx: GameContext): -1 | 1 | null {
    for (const [, pulse] of ctx.world.view(Pulse)) {
      if (pulse.state === 'pending' && pulse.beat.kind === 'choice') {
        return pulse.beat.side === -1 ? -1 : 1;
      }
    }
    return null;
  }

  private spawn(ctx: GameContext, role: 'center' | 'left' | 'right', offset: number, visibility: number): void {
    const world = ctx.world;
    const unit = ctx.view.unit;
    const entity = world.createEntity();
    world.add(entity, Transform, { x: ctx.view.cx + offset * unit, y: ctx.view.cy });
    world.add(entity, Sprite, {
      shape: SHAPE_RING,
      radius: LAYOUT.targetRadius * unit,
      thickness: LAYOUT.targetThickness * unit,
      softness: 1.4,
      color: copyColorFrom(PALETTE.chalk, visibility * 0.32),
      layer: 10,
    });
    world.add(entity, Target, { role, kick: 0, visibility });
    void SHAPE_GLOW;
  }
}
