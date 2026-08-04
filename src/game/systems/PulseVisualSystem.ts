import type { ISystem } from '../../core/ecs/System';
import { clamp, lerp } from '../../core/math/util';
import { SHAPE_ARC, SHAPE_RING } from '../../render/IRenderer';
import { Pulse, Sprite, Transform } from '../components';
import { visualTheme } from '../../config/visualThemes';
import { copyColorFrom, gradeColor, telegraphColor } from '../colors';
import { LAYOUT } from '../layout';
import type { GameContext } from '../GameContext';

const RESOLVED_FADE_MS = 170;

/**
 * Кольцо летит ровно столько, сколько длится следующий интервал,
 * поэтому смена темпа сначала видна и только потом требует реакции (GDD §12).
 */
export class PulseVisualSystem implements ISystem {
  readonly name = 'PulseVisual';

  update(_dt: number, ctx: GameContext): void {
    const now = ctx.clock.now;
    const unit = ctx.view.unit;
    const targetRadius = LAYOUT.targetRadius * unit;
    const spawnRadius = LAYOUT.spawnRadius * unit;
    const bloom = visualTheme(ctx.visualTheme).bloom;

    for (const [entity, pulse] of ctx.world.view(Pulse)) {
      const sprite = ctx.world.require(entity, Sprite);
      const transform = ctx.world.require(entity, Transform);
      transform.x = ctx.view.cx + pulse.anchorX * unit;
      transform.y = ctx.view.cy;

      if (pulse.state === 'resolved') {
        const age = now - pulse.resolvedAt;
        if (age >= RESOLVED_FADE_MS) {
          ctx.world.destroyEntity(entity);
          continue;
        }
        const t = age / RESOLVED_FADE_MS;
        const color = gradeColor(pulse.grade ?? 'ok');
        sprite.color[0] = color[0];
        sprite.color[1] = color[1];
        sprite.color[2] = color[2];
        sprite.color[3] = (1 - t) * 0.8;
        sprite.radius = lerp(targetRadius, targetRadius * (pulse.grade === 'miss' ? 0.6 : 1.35), t);
        sprite.shape = SHAPE_RING;
        sprite.arc = undefined;
        sprite.glow = (pulse.grade === 'miss' ? 0.8 : 2.4) * (1 - t) * bloom;
        continue;
      }

      const beat = pulse.beat;
      const progress = clamp(
        (now - (beat.targetTime - beat.approachMs)) / beat.approachMs,
        0,
        1.45,
      );
      const held = pulse.holdStartedAt !== null;
      const radius = held
        ? targetRadius
        : Math.max(targetRadius * 0.42, lerp(spawnRadius, targetRadius, progress));

      const color = telegraphColor(beat.telegraph);
      sprite.radius = radius;
      sprite.shape = pulse.sector ? SHAPE_ARC : SHAPE_RING;
      if (pulse.sector) {
        pulse.sectorAngle = now / 1000 * (0.95 + (pulse.beat.index % 3) * 0.16) + pulse.beat.index * 1.73;
        sprite.rotation = pulse.sectorAngle;
        sprite.arc = pulse.sectorArc;
      } else {
        sprite.arc = undefined;
      }
      sprite.thickness = LAYOUT.ringThickness * unit * (beat.kind === 'hold' ? 1.8 : 1);
      // Кольцо разгорается по мере подлёта — попадание читается как вспышка света.
      sprite.glow = (0.7 + progress * 1.6) * bloom;
      sprite.color[0] = color[0];
      sprite.color[1] = color[1];
      sprite.color[2] = color[2];
      sprite.color[3] = clamp(progress * 3.5, 0, 1) * (beat.kind === 'double' ? 0.75 : 0.95);

      // Двойной удар: второе, догоняющее кольцо-подсказка.
      if (beat.kind === 'double' && pulse.taps === 1) {
        sprite.color[3] = 0.4;
      }

      this.updateHoldGauge(ctx, entity, now);
    }
  }

  private updateHoldGauge(ctx: GameContext, entity: number, now: number): void {
    const pulse = ctx.world.require(entity, Pulse);
    if (pulse.beat.kind !== 'hold') return;
    const unit = ctx.view.unit;

    if (pulse.holdStartedAt === null) {
      if (pulse.aux !== null) {
        ctx.world.destroyEntity(pulse.aux);
        pulse.aux = null;
      }
      return;
    }

    if (pulse.aux === null) {
      const aux = ctx.world.createEntity();
      ctx.world.add(aux, Transform, { x: ctx.view.cx + pulse.anchorX * unit, y: ctx.view.cy });
      ctx.world.add(aux, Sprite, {
        shape: SHAPE_RING,
        radius: LAYOUT.targetRadius * unit * 1.45,
        thickness: unit * 0.02,
        softness: 2,
        color: copyColorFrom(telegraphColor('faster'), 0.8),
        layer: 18,
        glow: 1.8,
      });
      pulse.aux = aux;
    }

    const releaseAt = pulse.beat.targetTime + ctx.tuning.holdDurationMs;
    const left = clamp((releaseAt - now) / ctx.tuning.holdDurationMs, 0, 1);
    const sprite = ctx.world.require(pulse.aux, Sprite);
    sprite.thickness = unit * 0.02 * left + 1;
    sprite.color[3] = 0.35 + (1 - left) * 0.6;
  }
}
