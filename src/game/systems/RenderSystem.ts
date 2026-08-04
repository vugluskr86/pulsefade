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
        glow: sprite.glow,
        count: sprite.count,
        param: sprite.param,
        param2: sprite.param2,
      });
    }

    this.renderer.endFrame();
  }

  private clearColor(ctx: GameContext): Rgba {
    const theme = visualTheme(ctx.visualTheme);
    const ink = theme.ink;
    // Заливка остаётся почти чёрной: объём даёт дымка фона, а не осветление clear-цвета.
    const lift = ctx.fx.background * 0.028 + ctx.fx.flash * 0.02;
    const damage = ctx.fx.damage * 0.07;
    return [
      ink[0] + lift * theme.primary[0] + damage,
      ink[1] + lift * theme.primary[1],
      ink[2] + lift * theme.primary[2],
      1,
    ];
  }
}
