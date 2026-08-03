import type { ISystem } from '../../core/ecs/System';
import { SHAPE_DISC, SHAPE_RING } from '../../render/IRenderer';
import type { IAudio } from '../../audio/IAudio';
import type { IHaptics } from '../../platform/Haptics';
import type { JudgementEvent } from '../../domain/Judgement';
import { Lifetime, Particle, Sprite, Target, Transform, Tween } from '../components';
import { copyColorFrom, gradeColor } from '../colors';
import { LAYOUT } from '../layout';
import type { GameContext } from '../GameContext';

const PARTICLE_COUNT = { perfect: 12, great: 7, ok: 3, miss: 6 } as const;

/** Весь «juice» из GDD §9 в одном месте: hit-stop, вспышка, частицы, звук, вибрация. */
export class FeedbackSystem implements ISystem {
  readonly name = 'Feedback';

  constructor(
    private readonly ctx: GameContext,
    private readonly audio: IAudio,
    private readonly haptics: IHaptics,
  ) {
    ctx.bus.on('judgement', (event) => this.onJudgement(event));
  }

  update(): void {
    // событийная система
  }

  private onJudgement(event: JudgementEvent): void {
    const ctx = this.ctx;
    const tuning = ctx.tuning;
    const tier = ctx.fx.tier;
    const color = gradeColor(event.grade);
    const unit = ctx.view.unit;

    if (event.grade === 'perfect') ctx.clock.freeze(tuning.hitstop.perfect + ctx.rng.range(-8, 12));
    else if (event.grade === 'great') ctx.clock.freeze(tuning.hitstop.great);

    if (event.grade === 'miss') {
      ctx.fx.damage = 1;
      this.haptics.pulse(30);
    } else {
      ctx.fx.flash = event.grade === 'perfect' ? 1 : 0.55;
      ctx.fx.background = Math.min(1, ctx.fx.background + (event.grade === 'perfect' ? 0.3 : 0.18));
      this.haptics.pulse(event.grade === 'perfect' ? 12 : 7);
    }

    this.audio.hit(event.grade, ctx.score.multiplier);

    if (!event.stray) this.kickTargets();

    const budgetLeft = tuning.particleBudget - ctx.world.countOf(Particle);
    const base = PARTICLE_COUNT[event.grade];
    const count = Math.min(budgetLeft, Math.round(base * (1 + tier * 0.5)));
    for (let i = 0; i < count; i += 1) {
      this.spawnParticle(event.x, event.y, color, event.grade === 'miss' ? 0.55 : 1);
    }

    if (event.grade === 'miss' || event.stray) return;

    // основное расходящееся кольцо
    this.spawnRing(event.x, event.y, LAYOUT.targetRadius * unit, unit * 0.42, 320, color, 0.9);
    // GDD §9: вторичные кольца появляются со ступени 10+
    if (tier >= 2) {
      this.spawnRing(event.x, event.y, LAYOUT.targetRadius * unit * 1.2, unit * 0.72, 560, color, 0.4);
    }
  }

  private kickTargets(): void {
    for (const [, target] of this.ctx.world.view(Target)) target.kick = 1;
  }

  private spawnParticle(
    x: number,
    y: number,
    color: readonly [number, number, number, number],
    scale: number,
  ): void {
    const ctx = this.ctx;
    const entity = ctx.world.createEntity();
    const angle = ctx.rng.range(0, Math.PI * 2);
    const speed = ctx.rng.range(0.35, 1.15) * ctx.view.unit * scale;
    const life = ctx.rng.range(260, 620);
    const radius = ctx.rng.range(0.004, 0.011) * ctx.view.unit;

    ctx.world.add(entity, Transform, { x, y });
    ctx.world.add(entity, Particle, {
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      drag: 2.6,
    });
    ctx.world.add(entity, Sprite, {
      shape: SHAPE_DISC,
      radius,
      thickness: 0,
      softness: 1.2,
      color: copyColorFrom(color, 1),
      layer: 30,
    });
    ctx.world.add(entity, Lifetime, { left: life, total: life });
    ctx.world.add(entity, Tween, {
      radiusFrom: radius,
      radiusTo: radius * 0.2,
      alphaFrom: 1,
      alphaTo: 0,
      thicknessFrom: 0,
      thicknessTo: 0,
      ease: 1,
    });
  }

  private spawnRing(
    x: number,
    y: number,
    from: number,
    to: number,
    life: number,
    color: readonly [number, number, number, number],
    alpha: number,
  ): void {
    const ctx = this.ctx;
    const entity = ctx.world.createEntity();
    ctx.world.add(entity, Transform, { x, y });
    ctx.world.add(entity, Sprite, {
      shape: SHAPE_RING,
      radius: from,
      thickness: LAYOUT.ringThickness * ctx.view.unit,
      softness: 2,
      color: copyColorFrom(color, alpha),
      layer: 15,
    });
    ctx.world.add(entity, Lifetime, { left: life, total: life });
    ctx.world.add(entity, Tween, {
      radiusFrom: from,
      radiusTo: to,
      alphaFrom: alpha,
      alphaTo: 0,
      thicknessFrom: LAYOUT.ringThickness * ctx.view.unit,
      thicknessTo: 1,
      ease: 1,
    });
  }
}
