import type { ISystem } from '../../core/ecs/System';
import { damp } from '../../core/math/util';
import { SHAPE_ARC, SHAPE_RING } from '../../render/IRenderer';
import { toneColor, visualTheme, type VisualTheme } from '../../config/visualThemes';
import { targetStyle, type TargetDeco, type TargetStyle } from '../../config/targetStyles';
import { Pulse, Sprite, Target, Transform, type MutableColor, type PulseData } from '../components';
import { copyColorFrom, telegraphColor } from '../colors';
import { LAYOUT } from '../layout';
import type { GameContext } from '../GameContext';

type TargetRole = 'center' | 'left' | 'right';

/**
 * Мишень собирается из стиля (config/targetStyles): каждая покупка меняет
 * саму конструкцию прибора, а не только видимость трёх готовых слоёв.
 * Само кольцо мишени остаётся геймплейным якорем и не зависит от косметики.
 */
export class TargetSystem implements ISystem {
  readonly name = 'Target';
  private activeStyle = '';
  private flatCache: { deco: TargetDeco; index: number }[] = [];
  private flatCacheKey = '';

  constructor(ctx: GameContext) {
    this.activeStyle = ctx.visualTarget;
    this.spawn(ctx, 'center', 0, 1);
    this.spawn(ctx, 'left', -LAYOUT.choiceOffset, 0);
    this.spawn(ctx, 'right', LAYOUT.choiceOffset, 0);
  }

  update(dt: number, ctx: GameContext): void {
    if (this.activeStyle !== ctx.visualTarget) this.rebuild(ctx);

    const unit = ctx.view.unit;
    const choiceSide = this.pendingChoiceSide(ctx);
    const time = ctx.clock.now / 1000;
    const theme = visualTheme(ctx.visualTheme);
    const style = targetStyle(ctx.visualTarget);
    const sectorPulse = this.activeSector(ctx);

    for (const [entity, target] of ctx.world.view(Target)) {
      const transform = ctx.world.require(entity, Transform);
      const sprite = ctx.world.require(entity, Sprite);
      const offset = target.role === 'left' ? -LAYOUT.choiceOffset : target.role === 'right' ? LAYOUT.choiceOffset : 0;
      transform.x = ctx.view.cx + offset * unit;
      transform.y = ctx.view.cy;

      const wanted = target.role === 'center'
        ? (choiceSide === null ? 1 : 0.18)
        : choiceSide === null ? 0 : (target.role === 'left' ? -1 : 1) === choiceSide ? 1 : 0.3;
      target.visibility = damp(target.visibility, wanted, 14, dt);
      target.kick = damp(target.kick, 0, 9, dt);
      target.sectorAngle += (dt / 1000) * (target.variant % 2 === 0 ? 0.48 : -0.7) * (1 + ctx.fx.tier * 0.13);

      const base = LAYOUT.targetRadius * unit;
      sprite.radius = base * (1 + target.kick * 0.09);
      sprite.thickness = LAYOUT.targetThickness * unit * style.ringThickness * (1 + target.kick * 1.6);
      sprite.glow = style.ringGlow * theme.bloom;

      const isSyncedSector = target.role === 'center' && sectorPulse !== null;
      sprite.shape = isSyncedSector ? SHAPE_ARC : SHAPE_RING;
      sprite.arc = isSyncedSector ? sectorPulse.sectorArc : undefined;
      sprite.rotation = isSyncedSector ? sectorPulse.sectorAngle : undefined;
      if (isSyncedSector) {
        sprite.radius *= 0.72;
        sprite.thickness *= 1.8;
        this.color(sprite.color, telegraphColor(sectorPulse.beat.telegraph), target.visibility * (0.85 + target.kick * 0.2));
      } else {
        this.color(sprite.color, theme.primary, target.visibility * (style.ringAlpha * 0.62 + target.kick * 0.5));
      }

      this.updateDecorations(ctx, target, transform.x, transform.y, time, style, theme);
    }
  }

  private updateDecorations(
    ctx: GameContext,
    target: { visibility: number; kick: number; variant: number; decorations: number[] },
    x: number, y: number, time: number, style: TargetStyle, theme: VisualTheme,
  ): void {
    const unit = ctx.view.unit;
    const base = LAYOUT.targetRadius * unit;
    const visible = target.visibility;
    const kick = target.kick;

    // Общий дрейф ядра: элементы с follow едут вместе с ним.
    const phase = time * (0.9 + target.variant * 0.13) + target.variant * 1.9;
    const drift = style.wander * base * (1 + ctx.fx.tier * 0.22);
    const driftX = Math.cos(phase) * drift;
    const driftY = Math.sin(phase * 1.61) * drift * 0.72;

    const decos = this.flatten(style, ctx.visualTarget);
    for (let i = 0; i < target.decorations.length && i < decos.length; i += 1) {
      const entity = target.decorations[i];
      const transform = ctx.world.get(entity, Transform);
      const sprite = ctx.world.get(entity, Sprite);
      if (!transform || !sprite) continue;
      const { deco, index } = decos[i];

      transform.x = x;
      transform.y = y;
      if (deco.follow) {
        transform.x += driftX;
        transform.y += driftY;
      }

      const orbitPhase = (deco.rot ?? 0) + (deco.dphase ?? 0) * index + time * (deco.orbitSpeed ?? 0);
      if (deco.orbit) {
        transform.x += Math.cos(orbitPhase) * deco.orbit * base;
        transform.y += Math.sin(orbitPhase) * deco.orbit * base;
      }

      let radius = deco.r;
      if (deco.breathe) radius += Math.sin(time * (deco.bspeed ?? 2)) * deco.breathe;
      radius += kick * (deco.kick ?? 0);
      sprite.radius = radius * base;

      let alpha = deco.alpha * visible;
      alpha *= 1 + kick * (deco.kickAlpha ?? 0);
      if (deco.pulse) {
        const w = Math.sin(time * (deco.pspeed ?? 4));
        alpha *= 1 - deco.pulse + deco.pulse * w * w;
      }

      sprite.rotation = deco.align
        ? orbitPhase
        : (deco.rot ?? 0) + (deco.drot ?? 0) * index + time * (deco.spin ?? 0);
      sprite.glow = (deco.glow ?? 0) * theme.bloom;

      this.color(sprite.color, toneColor(theme, deco.tone), alpha);
    }
  }

  /** Раскрытие repeat кэшируется: список перестраивается только при смене стиля. */
  private flatten(style: TargetStyle, key: string): { deco: TargetDeco; index: number }[] {
    if (this.flatCacheKey === key && this.flatCache.length > 0) return this.flatCache;
    const list: { deco: TargetDeco; index: number }[] = [];
    for (const deco of style.decorations) {
      const repeat = deco.repeat ?? 1;
      for (let i = 0; i < repeat; i += 1) list.push({ deco, index: i });
    }
    this.flatCache = list;
    this.flatCacheKey = key;
    return list;
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

  private rebuild(ctx: GameContext): void {
    this.activeStyle = ctx.visualTarget;
    for (const [, target] of ctx.world.view(Target)) {
      for (const entity of target.decorations) ctx.world.destroyEntity(entity);
      target.decorations = this.createDecorations(ctx);
    }
  }

  private spawn(ctx: GameContext, role: TargetRole, offset: number, visibility: number): void {
    const world = ctx.world;
    const unit = ctx.view.unit;
    const theme = visualTheme(ctx.visualTheme);
    const entity = world.createEntity();
    const decorations = this.createDecorations(ctx);
    world.add(entity, Transform, { x: ctx.view.cx + offset * unit, y: ctx.view.cy });
    world.add(entity, Sprite, {
      shape: SHAPE_RING,
      radius: LAYOUT.targetRadius * unit,
      thickness: LAYOUT.targetThickness * unit,
      softness: 1.4,
      color: copyColorFrom(theme.primary, visibility * 0.42),
      layer: 10,
      glow: 2,
    });
    // Визуальная вариация не тратит игровой RNG: реплеи и паттерны остаются идентичными.
    const variant = role === 'center' ? 1 : role === 'left' ? 0 : 2;
    world.add(entity, Target, { role, kick: 0, visibility, variant, sectorAngle: variant * 2.094, decorations });
  }

  private createDecorations(ctx: GameContext): number[] {
    const style = targetStyle(ctx.visualTarget);
    const theme = visualTheme(ctx.visualTheme);
    const entities: number[] = [];
    for (const { deco } of this.flatten(style, ctx.visualTarget)) {
      const entity = ctx.world.createEntity();
      ctx.world.add(entity, Transform, { x: ctx.view.cx, y: ctx.view.cy });
      ctx.world.add(entity, Sprite, {
        shape: deco.shape,
        radius: 1,
        thickness: (deco.t ?? 0.04) * LAYOUT.targetRadius * ctx.view.unit,
        softness: 1.4,
        color: copyColorFrom(toneColor(theme, deco.tone), 0),
        layer: deco.layer,
        arc: deco.arc,
        count: deco.count,
        param: deco.p1,
        glow: 0,
      });
      entities.push(entity);
    }
    return entities;
  }

  private color(target: MutableColor, source: readonly [number, number, number, number], alpha: number): void {
    target[0] = source[0]; target[1] = source[1]; target[2] = source[2]; target[3] = Math.max(0, alpha);
  }
}
