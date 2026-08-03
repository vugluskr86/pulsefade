import type { ISystem } from '../../core/ecs/System';
import { Particle, Transform } from '../components';
import type { GameContext } from '../GameContext';

export class ParticleSystem implements ISystem {
  readonly name = 'Particle';

  update(dt: number, ctx: GameContext): void {
    if (dt <= 0) return;
    const seconds = dt / 1000;
    for (const [entity, particle] of ctx.world.view(Particle)) {
      const transform = ctx.world.require(entity, Transform);
      transform.x += particle.vx * seconds;
      transform.y += particle.vy * seconds;
      const decay = Math.exp(-particle.drag * seconds);
      particle.vx *= decay;
      particle.vy *= decay;
    }
  }
}
