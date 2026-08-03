import type { ISystem } from '../../core/ecs/System';
import { clamp, damp } from '../../core/math/util';
import { SHAPE_GLOW } from '../../render/IRenderer';
import { Sprite, Transform } from '../components';
import { PALETTE, copyColorFrom } from '../colors';
import type { GameContext } from '../GameContext';

const TIER_BASE = [0, 0.12, 0.28, 0.5] as const;

/** GDD §9: со ступени 20+ фон начинает пульсировать вместе с игроком. */
export class BackgroundSystem implements ISystem {
  readonly name = 'Background';
  private readonly halo: number;

  constructor(ctx: GameContext) {
    this.halo = ctx.world.createEntity();
    ctx.world.add(this.halo, Transform, { x: ctx.view.cx, y: ctx.view.cy });
    ctx.world.add(this.halo, Sprite, {
      shape: SHAPE_GLOW,
      radius: ctx.view.unit * 0.9,
      thickness: 0,
      softness: 1,
      color: copyColorFrom(PALETTE.violet, 0),
      layer: 0,
    });
  }

  update(dt: number, ctx: GameContext): void {
    const fx = ctx.fx;
    fx.flash = Math.max(0, fx.flash - dt / 190);
    fx.damage = Math.max(0, fx.damage - dt / 420);
    fx.background = damp(fx.background, TIER_BASE[fx.tier], 3.2, dt);

    const transform = ctx.world.require(this.halo, Transform);
    const sprite = ctx.world.require(this.halo, Sprite);
    transform.x = ctx.view.cx;
    transform.y = ctx.view.cy;
    sprite.radius = ctx.view.unit * (0.8 + fx.background * 0.5);
    sprite.color[3] = clamp(fx.background * (fx.tier >= 3 ? 0.3 : 0.14), 0, 0.4);
  }
}
