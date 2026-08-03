import type { ISystem } from '../../core/ecs/System';
import { easeOutCubic, lerp } from '../../core/math/util';
import { Lifetime, Sprite, Tween } from '../components';
import type { GameContext } from '../GameContext';

/** Единая интерполяция эффектов: радиус, толщина и прозрачность по времени жизни. */
export class TweenSystem implements ISystem {
  readonly name = 'Tween';

  update(_dt: number, ctx: GameContext): void {
    for (const [entity, tween] of ctx.world.view(Tween)) {
      const life = ctx.world.get(entity, Lifetime);
      const sprite = ctx.world.get(entity, Sprite);
      if (!life || !sprite || life.total <= 0) continue;
      const raw = 1 - life.left / life.total;
      const t = tween.ease === 1 ? easeOutCubic(raw) : raw;
      sprite.radius = lerp(tween.radiusFrom, tween.radiusTo, t);
      sprite.thickness = lerp(tween.thicknessFrom, tween.thicknessTo, t);
      sprite.color[3] = lerp(tween.alphaFrom, tween.alphaTo, t);
    }
  }
}
