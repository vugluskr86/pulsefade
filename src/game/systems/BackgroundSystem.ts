import type { ISystem } from '../../core/ecs/System';
import { clamp, damp } from '../../core/math/util';
import { SHAPE_ARC, SHAPE_DISC, SHAPE_GLOW, SHAPE_RING, type ShapeKind } from '../../render/IRenderer';
import { backgroundPreset, visualTheme, type VisualTheme } from '../../config/visualThemes';
import { Sprite, Transform } from '../components';
import { copyColorFrom } from '../colors';
import type { GameContext } from '../GameContext';

const TIER_BASE = [0, 0.12, 0.28, 0.5] as const;

interface BackgroundElement {
  readonly entity: number;
  readonly tone: number;
  readonly baseX: number;
  readonly baseY: number;
  readonly orbitX: number;
  readonly orbitY: number;
  readonly speed: number;
  readonly phase: number;
  readonly baseRadius: number;
  readonly alpha: number;
  readonly pulse: number;
}

/**
 * Ten scene grammars based on the supplied artwork: portals, radar rings, tunnel,
 * horizon, gates and asymmetric orbits. The seed selects a grammar and perturbs it
 * without ever touching the gameplay RNG.
 */
export class BackgroundSystem implements ISystem {
  readonly name = 'Background';
  private elements: BackgroundElement[] = [];
  private variant = 0;
  private salt = 0;
  private activeBackground = '';

  constructor(private readonly seed: number, ctx: GameContext) {
    this.rebuild(ctx);
  }

  update(dt: number, ctx: GameContext): void {
    if (this.activeBackground !== ctx.visualBackground) this.rebuild(ctx);
    const fx = ctx.fx;
    fx.flash = Math.max(0, fx.flash - dt / 190);
    fx.damage = Math.max(0, fx.damage - dt / 420);
    fx.background = damp(fx.background, TIER_BASE[fx.tier], 3.2, dt);

    const theme = visualTheme(ctx.visualTheme);
    const preset = backgroundPreset(ctx.visualBackground);
    const tones = [...theme.background, theme.primary, theme.secondary, theme.accent, theme.sector];
    const time = ctx.clock.now / 1000;
    const motion = this.gradientMotion(time, preset.motion, preset.speed);
    for (const item of this.elements) {
      const transform = ctx.world.require(item.entity, Transform);
      const sprite = ctx.world.require(item.entity, Sprite);
      const orbit = time * item.speed * preset.speed + item.phase + motion.turn;
      transform.x = ctx.view.cx + (item.baseX + motion.x + Math.cos(orbit) * item.orbitX) * ctx.view.unit;
      transform.y = ctx.view.cy + (item.baseY + motion.y + Math.sin(orbit * 1.31) * item.orbitY) * ctx.view.unit;
      sprite.radius = ctx.view.unit * (item.baseRadius + Math.sin(orbit * 1.7) * item.pulse + motion.scale * item.pulse * 3 + fx.background * item.pulse * 1.6);
      sprite.rotation = orbit;
      const color = tones[item.tone] ?? theme.primary;
      sprite.color[0] = color[0];
      sprite.color[1] = color[1];
      sprite.color[2] = color[2];
      sprite.color[3] = clamp(item.alpha * (0.55 + motion.energy * 0.65) + fx.background * item.alpha * 0.9 + fx.flash * item.alpha * 0.4, 0, 0.42);
      if (item.tone === 0 && fx.damage > 0) sprite.color[3] += fx.damage * 0.07;
    }
  }

  private rebuild(ctx: GameContext): void {
    for (const item of this.elements) ctx.world.destroyEntity(item.entity);
    this.elements = [];
    this.activeBackground = ctx.visualBackground;
    const preset = backgroundPreset(ctx.visualBackground);
    this.variant = preset.scene;
    this.salt = this.hash(this.seed ^ (preset.scene + 1) * 0x6d2b79f5);
    const theme = visualTheme(ctx.visualTheme);
    for (let i = 0; i < 3; i += 1) {
      this.add(ctx, theme, SHAPE_GLOW, i, 0, 0, 0.2 + i * 0.11, 0.14 + i * 0.08, 0.075 + i * 0.025, i * 2.1 + this.salt, 0.75 + i * 0.1, 0.09, 0.09, 0);
    }
    this.buildVariant(ctx, theme);
  }

  private gradientMotion(time: number, motion: ReturnType<typeof backgroundPreset>['motion'], speed: number): { energy: number; x: number; y: number; scale: number; turn: number } {
    const t = time * speed;
    switch (motion) {
      case 'breathe': return { energy: 0.5 + 0.5 * Math.sin(t * 0.9), x: 0, y: 0, scale: Math.sin(t * 0.9), turn: 0 };
      case 'flow': return { energy: 0.55 + 0.45 * Math.sin(t * 1.4), x: Math.sin(t * 0.38) * 0.16, y: Math.cos(t * 0.52) * 0.07, scale: 0.25, turn: t * 0.04 };
      case 'drift': return { energy: 0.5 + 0.5 * Math.sin(t * 0.65), x: Math.cos(t * 0.22) * 0.18, y: Math.sin(t * 0.17) * 0.13, scale: 0.1, turn: -t * 0.12 };
      case 'rush': return { energy: 0.45 + 0.55 * Math.sin(t * 2.8) ** 2, x: 0, y: Math.sin(t * 0.6) * 0.04, scale: Math.sin(t * 2.8) * 0.55, turn: t * 0.16 };
      case 'scan': return { energy: 0.5 + 0.5 * Math.sin(t * 2.2), x: Math.sin(t * 0.7) * 0.06, y: 0, scale: 0.18, turn: t * 0.42 };
      case 'flicker': return { energy: 0.45 + 0.55 * Math.sin(t * 5.6 + Math.sin(t * 1.7)) ** 2, x: 0, y: 0, scale: 0.04, turn: 0 };
      case 'eclipse': return { energy: 0.38 + 0.62 * Math.max(0, Math.sin(t * 0.68)), x: Math.sin(t * 0.28) * 0.26, y: Math.cos(t * 0.21) * 0.12, scale: 0.35, turn: -t * 0.05 };
      case 'counter': return { energy: 0.5 + 0.5 * Math.sin(t * 1.1), x: 0, y: Math.sin(t * 0.4) * 0.05, scale: 0.16, turn: t * 0.24 };
      case 'twinkle': return { energy: 0.3 + 0.7 * Math.sin(t * 3.5 + Math.sin(t * 0.7)) ** 2, x: 0, y: 0, scale: 0.08, turn: t * 0.08 };
      default: return { energy: 0.5 + 0.5 * Math.sin(t * 1.45), x: 0, y: 0, scale: Math.sin(t * 1.45) * 0.22, turn: t * 0.09 };
    }
  }

  private buildVariant(ctx: GameContext, theme: VisualTheme): void {
    const shift = (this.salt - 0.5) * 0.16;
    const add = (shape: ShapeKind, tone: number, radius: number, alpha: number, x = 0, y = 0, arc?: number, speed = 0.05): void =>
      this.add(ctx, theme, shape, tone, x, y, 0.012, 0.01, speed, this.salt * Math.PI * 2 + radius, radius, alpha, 0.012, 1, arc);

    switch (this.variant) {
      case 0: // concentric reactor / key art
        add(SHAPE_RING, 4, 0.73, 0.12);
        add(SHAPE_RING, 3, 0.93, 0.08);
        for (let i = 0; i < 6; i += 1) add(SHAPE_ARC, i % 2 ? 4 : 5, 1.1, 0.16, 0, 0, 0.3, 0.08 + i * 0.01);
        break;
      case 1: // enormous portal from portrait reference
        add(SHAPE_RING, 3, 1.3, 0.12, 0, -0.15);
        add(SHAPE_RING, 4, 1.08, 0.08, 0, -0.15);
        for (let i = 0; i < 4; i += 1) add(SHAPE_ARC, 5, 1.45, 0.15, 0, -0.15, 0.5, -0.04 - i * 0.01);
        break;
      case 2: // horizon and a distant radar
        add(SHAPE_RING, 4, 1.35, 0.11, 0, 0.68);
        add(SHAPE_RING, 3, 1.02, 0.09, 0, 0.68);
        for (let i = 0; i < 5; i += 1) add(SHAPE_ARC, i % 2 ? 5 : 3, 1.58, 0.12, shift, 0.68, 0.38, 0.03);
        break;
      case 3: // offset double orbit
        add(SHAPE_RING, 3, 0.87, 0.1, -0.34, -0.15);
        add(SHAPE_RING, 4, 1.12, 0.07, 0.38, 0.2);
        for (let i = 0; i < 5; i += 1) add(SHAPE_ARC, 5, 0.96 + i * 0.08, 0.14, -0.32, -0.15, 0.32, 0.08);
        break;
      case 4: // lower tunnel / neon floor
        for (let i = 0; i < 4; i += 1) add(SHAPE_RING, i % 2 ? 3 : 4, 0.72 + i * 0.17, 0.09, 0, 0.52);
        for (let i = 0; i < 4; i += 1) add(SHAPE_ARC, 5, 1.42, 0.16, 0, 0.5, 0.42, -0.05);
        break;
      case 5: // target scanner with wide rotating slices
        add(SHAPE_RING, 4, 1.05, 0.12);
        for (let i = 0; i < 8; i += 1) add(SHAPE_ARC, i % 3 === 0 ? 5 : 3, 0.78 + (i % 2) * 0.25, 0.18, 0, 0, 0.17, 0.11);
        break;
      case 6: // corner brackets / framed control panel
        for (let i = 0; i < 4; i += 1) add(SHAPE_ARC, i % 2 ? 4 : 3, 0.62, 0.15, i < 2 ? -0.72 : 0.72, i % 2 ? -0.72 : 0.72, 0.78, 0.02);
        add(SHAPE_RING, 4, 1.36, 0.06);
        break;
      case 7: // eclipse / asymmetric source glow
        add(SHAPE_GLOW, 5, 0.62, 0.22, 0.48, -0.3);
        add(SHAPE_RING, 3, 0.82, 0.11, 0.42, -0.25);
        for (let i = 0; i < 5; i += 1) add(SHAPE_ARC, 4, 1.25, 0.14, 0.35, -0.2, 0.34, -0.07);
        break;
      case 8: // opposing gates
        for (const side of [-1, 1]) {
          add(SHAPE_RING, 3, 0.75, 0.1, side * 0.76, 0);
          for (let i = 0; i < 3; i += 1) add(SHAPE_ARC, 5, 0.95 + i * 0.12, 0.14, side * 0.76, 0, 0.42, side * 0.05);
        }
        break;
      default: // constellation: a quiet field of moving indicators
        add(SHAPE_RING, 4, 1.22, 0.06);
        for (let i = 0; i < 10; i += 1) add(i % 2 ? SHAPE_DISC : SHAPE_ARC, i % 3 === 0 ? 5 : 3, i % 2 ? 0.012 : 0.96, 0.13, Math.cos(i * 2.4) * 0.72, Math.sin(i * 1.7) * 0.62, i % 2 ? undefined : 0.09, 0.05 + i * 0.006);
    }
  }

  private add(
    ctx: GameContext, theme: VisualTheme, shape: ShapeKind, tone: number, baseX: number, baseY: number, orbitX: number, orbitY: number, speed: number, phase: number, baseRadius: number, alpha: number, pulse: number, layer: number, arc?: number,
  ): void {
    const entity = ctx.world.createEntity();
    const colors = [...theme.background, theme.primary, theme.secondary, theme.accent, theme.sector];
    ctx.world.add(entity, Transform, { x: ctx.view.cx, y: ctx.view.cy });
    ctx.world.add(entity, Sprite, { shape, radius: 1, thickness: shape === SHAPE_DISC || shape === SHAPE_GLOW ? 0 : 1, softness: 1.4, color: copyColorFrom(colors[tone] ?? theme.primary, 0), layer, arc });
    this.elements.push({ entity, tone, baseX, baseY, orbitX, orbitY, speed, phase, baseRadius, alpha, pulse });
  }

  private hash(value: number): number {
    let n = value >>> 0;
    n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
    n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
    return ((n ^ (n >>> 16)) >>> 0) / 0x100000000;
  }
}
