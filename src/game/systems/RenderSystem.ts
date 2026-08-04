import type { ISystem } from '../../core/ecs/System';
import type { IRenderer } from '../../render/IRenderer';
import type { Rgba } from '../../config/palette';
import { visualTheme } from '../../config/visualThemes';
import { Sprite, Transform } from '../components';
import type { GameContext } from '../GameContext';

/** Единственная система, знающая про рендерер. Всё остальное работает с компонентами. */
export class RenderSystem implements ISystem {
  readonly name = 'Render';
  private readonly buffer: { entity: number; layer: number }[] = [];

  constructor(private readonly renderer: IRenderer) {}

  update(_dt: number, ctx: GameContext): void {
    this.renderer.beginFrame(this.clearColor(ctx));

    this.buffer.length = 0;
    for (const [entity, sprite] of ctx.world.view(Sprite)) {
      this.buffer.push({ entity, layer: sprite.layer });
    }
    this.buffer.sort((a, b) => a.layer - b.layer);

    for (const item of this.buffer) {
      const sprite = ctx.world.get(item.entity, Sprite);
      const transform = ctx.world.get(item.entity, Transform);
      if (!sprite || !transform) continue;
      this.renderer.draw({
        x: transform.x,
        y: transform.y,
        radius: sprite.radius,
        thickness: sprite.thickness,
        softness: sprite.softness,
        shape: sprite.shape,
        color: sprite.color,
        rotation: sprite.rotation,
        arc: sprite.arc,
      });
    }

    this.renderer.endFrame();
  }

  private clearColor(ctx: GameContext): Rgba {
    const ink = visualTheme(ctx.visualTheme).ink;
    const glow = ctx.fx.background * 0.05 + ctx.fx.flash * 0.035;
    const damage = ctx.fx.damage * 0.09;
    return [ink[0] + glow * 0.5 + damage, ink[1] + glow * 0.3, ink[2] + glow * 0.9, 1];
  }
}
