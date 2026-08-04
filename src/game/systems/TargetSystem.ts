import type { ISystem } from '../../core/ecs/System';
import { damp } from '../../core/math/util';
import { SHAPE_ARC, SHAPE_BAR, SHAPE_DISC, SHAPE_GLOW, SHAPE_RING } from '../../render/IRenderer';
import { targetPreset, visualTheme, type TargetPreset } from '../../config/visualThemes';
import { Pulse, Sprite, Target, Transform, type MutableColor, type PulseData } from '../components';
import { copyColorFrom, telegraphColor } from '../colors';
import { LAYOUT } from '../layout';
import type { GameContext } from '../GameContext';

type TargetRole = 'center' | 'left' | 'right';

/** A deterministic procedural target: rings, rotating sectors, ticks and a drifting core. */
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
    const time = ctx.clock.now / 1000;
    const theme = visualTheme(ctx.visualTheme);
    const targetStyle = targetPreset(ctx.visualTarget);
    const sectorPulse = this.activeSector(ctx);

    for (const [entity, target] of ctx.world.view(Target)) {
      const transform = ctx.world.require(entity, Transform);
      const sprite = ctx.world.require(entity, Sprite);
      const offset = target.role === 'left' ? -LAYOUT.choiceOffset : target.role === 'right' ? LAYOUT.choiceOffset : 0;
      transform.x = ctx.view.cx + offset * unit;
      transform.y = ctx.view.cy;
      const wanted = target.role === 'center' ? (choiceSide === null ? 1 : 0.18) : choiceSide === null ? 0 : (target.role === 'left' ? -1 : 1) === choiceSide ? 1 : 0.3;
      target.visibility = damp(target.visibility, wanted, 14, dt);
      target.kick = damp(target.kick, 0, 9, dt);
      target.sectorAngle += dt / 1000 * (target.variant % 2 === 0 ? 0.48 : -0.7) * (1 + ctx.fx.tier * 0.13);

      sprite.radius = LAYOUT.targetRadius * unit * (1 + target.kick * 0.09);
      sprite.thickness = LAYOUT.targetThickness * unit * (1 + target.kick * 1.6);
      const isSyncedSector = target.role === 'center' && sectorPulse !== null;
      sprite.shape = isSyncedSector ? SHAPE_ARC : SHAPE_RING;
      sprite.arc = isSyncedSector ? sectorPulse.sectorArc : undefined;
      sprite.rotation = isSyncedSector ? sectorPulse.sectorAngle : undefined;
      if (isSyncedSector) {
        sprite.radius *= 0.72;
        sprite.thickness *= 1.8;
        this.color(sprite.color, telegraphColor(sectorPulse.beat.telegraph), target.visibility * (0.8 + target.kick * 0.2));
      } else {
        this.color(sprite.color, theme.primary, target.visibility * (0.42 + target.kick * 0.58));
      }
      this.updateDecorations(ctx, target, transform.x, transform.y, time, targetStyle, theme.primary, theme.secondary, theme.accent, theme.sector);
    }
  }

  private updateDecorations(
    ctx: GameContext, target: { visibility: number; kick: number; variant: number; sectorAngle: number; decorations: number[] }, x: number, y: number, time: number, style: TargetPreset,
    primary: readonly [number, number, number, number], secondary: readonly [number, number, number, number], accent: readonly [number, number, number, number], sector: readonly [number, number, number, number],
  ): void {
    const unit = ctx.view.unit;
    const visible = target.visibility;
    const base = LAYOUT.targetRadius * unit;
    for (let i = 0; i < target.decorations.length; i += 1) {
      const entity = target.decorations[i];
      const transform = ctx.world.get(entity, Transform);
      const sprite = ctx.world.get(entity, Sprite);
      if (!transform || !sprite) continue;
      transform.x = x;
      transform.y = y;
      if (i === 0) { // soft pulse behind the target
        sprite.radius = base * (1.7 + Math.sin(time * 2.2) * 0.09 + target.kick * 0.75);
        this.color(sprite.color, secondary, visible * (0.055 + target.kick * 0.15));
      } else if (i === 1) { // outer instrumentation ring
        sprite.radius = base * (1.72 + target.kick * 0.12);
        this.color(sprite.color, secondary, visible * 0.23);
      } else if (i < 5) { // three wide scanning sectors
        sprite.radius = base * (1.38 + (i % 2) * 0.12);
        sprite.rotation = target.sectorAngle + (i - 2) * 2.094;
        sprite.arc = 0.34 + target.variant * 0.06;
        this.color(sprite.color, i === 2 ? accent : sector, style.sectors ? visible * (0.35 + target.kick * 0.55) : 0);
      } else if (i < 13) { // rotating ticks / line decoration
        sprite.radius = base * (1.08 + (i % 2) * 0.23);
        sprite.rotation = target.sectorAngle * -0.55 + (i - 5) * (Math.PI * 2 / 8);
        this.color(sprite.color, primary, visible * (0.24 + (i % 3 === 0 ? 0.16 : 0)));
      } else if (i < 17) { // independently rotating crosshair arms
        const arm = i - 13;
        const angle = time * (1.05 + target.variant * 0.18) + arm * Math.PI * 0.5;
        const distance = base * 0.67;
        transform.x += Math.cos(angle) * distance;
        transform.y += Math.sin(angle) * distance;
        sprite.radius = base * 0.17;
        sprite.thickness = unit * 0.012;
        sprite.rotation = angle;
        this.color(sprite.color, arm % 2 === 0 ? primary : sector, style.crosshair ? visible * (0.4 + target.kick * 0.35) : 0);
      } else { // a real wandering centre, separate from the stable outer target
        const corePhase = time * (0.9 + target.variant * 0.13) + target.variant * 1.9;
        const drift = style.wander ? base * (0.16 + ctx.fx.tier * 0.045) : 0;
        const coreX = Math.cos(corePhase) * drift;
        const coreY = Math.sin(corePhase * 1.61) * drift * 0.72;
        transform.x += coreX;
        transform.y += coreY;
        const corePart = i - 17;
        if (corePart === 0) {
          sprite.radius = base * (0.35 + target.kick * 0.35);
          this.color(sprite.color, accent, style.wander ? visible * (0.14 + target.kick * 0.2) : 0);
        } else if (corePart === 1) {
          sprite.radius = base * (0.2 + target.kick * 0.08);
          sprite.thickness = unit * 0.012;
          this.color(sprite.color, style.wander ? accent : primary, visible * (0.65 + target.kick * 0.2));
        } else {
          sprite.radius = base * (0.075 + target.kick * 0.025);
          this.color(sprite.color, primary, visible * (0.78 + 0.22 * Math.sin(time * 5.2)));
        }
      }
    }
  }

  private pendingChoiceSide(ctx: GameContext): -1 | 1 | null {
    for (const [, pulse] of ctx.world.view(Pulse)) {
      if (pulse.state === 'pending' && pulse.beat.kind === 'choice') return pulse.beat.side === -1 ? -1 : 1;
    }
    return null;
  }

  private activeSector(ctx: GameContext): PulseData | null {
    for (const [, pulse] of ctx.world.view(Pulse)) {
      if (pulse.state === 'pending' && pulse.sector) return pulse;
    }
    return null;
  }

  private spawn(ctx: GameContext, role: TargetRole, offset: number, visibility: number): void {
    const world = ctx.world;
    const unit = ctx.view.unit;
    const theme = visualTheme(ctx.visualTheme);
    const entity = world.createEntity();
    const decorations = this.createDecorations(ctx, theme.primary, theme.secondary, theme.accent);
    world.add(entity, Transform, { x: ctx.view.cx + offset * unit, y: ctx.view.cy });
    world.add(entity, Sprite, { shape: SHAPE_RING, radius: LAYOUT.targetRadius * unit, thickness: LAYOUT.targetThickness * unit, softness: 1.4, color: copyColorFrom(theme.primary, visibility * 0.42), layer: 10 });
    // Visual variation must not consume the gameplay RNG: replays and beat patterns stay identical.
    const variant = role === 'center' ? 1 : role === 'left' ? 0 : 2;
    world.add(entity, Target, { role, kick: 0, visibility, variant, sectorAngle: variant * 2.094, decorations });
  }

  private createDecorations(ctx: GameContext, primary: readonly [number, number, number, number], secondary: readonly [number, number, number, number], accent: readonly [number, number, number, number]): number[] {
    const entities: number[] = [];
    const add = (shape: typeof SHAPE_RING | typeof SHAPE_DISC | typeof SHAPE_GLOW | typeof SHAPE_ARC | typeof SHAPE_BAR, radius: number, thickness: number, color: readonly [number, number, number, number], layer: number, arc?: number): void => {
      const entity = ctx.world.createEntity();
      ctx.world.add(entity, Transform, { x: ctx.view.cx, y: ctx.view.cy });
      ctx.world.add(entity, Sprite, { shape, radius, thickness, softness: 1.4, color: copyColorFrom(color, 0), layer, arc });
      entities.push(entity);
    };
    add(SHAPE_GLOW, 1, 0, secondary, 2);
    add(SHAPE_RING, 1, 1, secondary, 4);
    for (let i = 0; i < 3; i += 1) add(SHAPE_ARC, 1, 1, accent, 6, 0.4);
    for (let i = 0; i < 8; i += 1) add(SHAPE_ARC, 1, 1, primary, 7, 0.06);
    for (let i = 0; i < 4; i += 1) add(SHAPE_BAR, 1, 1, primary, 8);
    add(SHAPE_GLOW, 1, 0, accent, 9);
    add(SHAPE_RING, 1, 1, accent, 11);
    add(SHAPE_DISC, 1, 0, primary, 12);
    return entities;
  }

  private color(target: MutableColor, source: readonly [number, number, number, number], alpha: number): void {
    target[0] = source[0]; target[1] = source[1]; target[2] = source[2]; target[3] = Math.max(0, alpha);
  }
}
