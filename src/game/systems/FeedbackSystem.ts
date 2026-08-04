import type { ISystem } from '../../core/ecs/System';
import { SHAPE_BAR, SHAPE_DISC, SHAPE_RING, type ShapeKind } from '../../render/IRenderer';
import type { IAudio } from '../../audio/IAudio';
import type { IHaptics } from '../../platform/Haptics';
import type { JudgementEvent } from '../../domain/Judgement';
import type { Rgba } from '../../config/palette';
import { particlePreset, type ParticlePreset } from '../../config/particleSets';
import { toneColor, visualTheme } from '../../config/visualThemes';
import { Lifetime, Particle, Sprite, Target, Transform, Tween } from '../components';
import { copyColorFrom, gradeColor } from '../colors';
import { LAYOUT } from '../layout';
import type { GameContext } from '../GameContext';

const PARTICLE_COUNT = { perfect: 12, great: 7, ok: 3, miss: 6 } as const;

const SHAPE_OF: Record<ParticlePreset['shape'], ShapeKind> = {
  disc: SHAPE_DISC,
  bar: SHAPE_BAR,
  ring: SHAPE_RING,
};

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
    const preset = particlePreset(ctx.visualParticles);
    const theme = visualTheme(ctx.visualTheme);
    const color = preset.tone ? toneColor(theme, preset.tone) : gradeColor(event.grade);
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
    const base = PARTICLE_COUNT[event.grade] * preset.countScale;
    const count = Math.min(budgetLeft, Math.round(base * (1 + tier * 0.5)));
    for (let i = 0; i < count; i += 1) {
      this.spawnParticle(event.x, event.y, color, event.grade === 'miss' ? 0.55 : 1, preset, theme.bloom);
    }

    if (event.grade === 'miss' || event.stray) return;

    const bloom = theme.bloom * preset.ringGlow;
    // основное расходящееся кольцо
    this.spawnRing(event.x, event.y, LAYOUT.targetRadius * unit, unit * 0.42, 320, color, 0.9, bloom);
    // GDD §9: вторичные кольца появляются со ступени 10+
    if (tier >= 2) {
      this.spawnRing(event.x, event.y, LAYOUT.targetRadius * unit * 1.2, unit * 0.72, 560, color, 0.4, bloom);
    }
    // Набор «Кольца»: на PERFECT добавляется каскад ударных волн.
    if (event.grade === 'perfect') {
      for (let i = 0; i < preset.shockwaves; i += 1) {
        const from = LAYOUT.targetRadius * unit * (0.6 + i * 0.35);
        this.spawnRing(event.x, event.y, from, unit * (0.55 + i * 0.28), 460 + i * 180, color, 0.55 - i * 0.15, bloom);
      }
    }
  }

  private kickTargets(): void {
    for (const [, target] of this.ctx.world.view(Target)) target.kick = 1;
  }

  private spawnParticle(
    x: number, y: number, color: Rgba, scale: number, preset: ParticlePreset, bloom: number,
  ): void {
    const ctx = this.ctx;
    const entity = ctx.world.createEntity();
    const unit = ctx.view.unit;
    const angle = ctx.rng.range(0, Math.PI * 2);
    const speed = ctx.rng.range(preset.speed[0], preset.speed[1]) * unit * scale;
    const life = ctx.rng.range(preset.life[0], preset.life[1]);
    const size = ctx.rng.range(preset.size[0], preset.size[1]) * unit;
    const isBar = preset.shape === 'bar';
    const isRing = preset.shape === 'ring';
    // Искра вытягивается вдоль вектора скорости, кольцо получает реальную толщину.
    const radius = isBar ? size * preset.stretch * 0.5 : size;
    const thickness = isBar ? size * 0.3 : isRing ? Math.max(1, size * 0.28) : 0;

    ctx.world.add(entity, Transform, { x, y });
    ctx.world.add(entity, Particle, {
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      drag: preset.drag,
      pull: preset.pull,
      originX: x,
      originY: y,
    });
    ctx.world.add(entity, Sprite, {
      shape: SHAPE_OF[preset.shape],
      radius,
      thickness,
      softness: 1.2,
      color: copyColorFrom(color, 1),
      layer: 30,
      rotation: isBar ? angle : undefined,
      glow: preset.glow * bloom,
    });
    ctx.world.add(entity, Lifetime, { left: life, total: life });
    ctx.world.add(entity, Tween, {
      radiusFrom: radius,
      radiusTo: radius * preset.fadeTo,
      alphaFrom: 1,
      alphaTo: 0,
      thicknessFrom: thickness,
      thicknessTo: isRing ? 1 : thickness * preset.fadeTo,
      ease: 1,
    });
  }

  private spawnRing(
    x: number, y: number, from: number, to: number, life: number, color: Rgba, alpha: number, glow: number,
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
      glow,
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
