import type { ISystem } from '../../core/ecs/System';
import { Lifetime } from '../components';
import type { GameContext } from '../GameContext';

export class LifetimeSystem implements ISystem {
  readonly name = 'Lifetime';

  update(dt: number, ctx: GameContext): void {
    for (const [entity, life] of ctx.world.view(Lifetime)) {
      life.left -= dt;
      if (life.left <= 0) ctx.world.destroyEntity(entity);
    }
  }
}
