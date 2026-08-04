import type { ISystem } from '../../core/ecs/System';
import { clamp, damp } from '../../core/math/util';
import { SHAPE_GLOW, SHAPE_WAVE, type ShapeKind } from '../../render/IRenderer';
import { toneColor, visualTheme, type ToneId, type VisualTheme } from '../../config/visualThemes';
import { backgroundScene, type BackgroundScene, type SceneLayer } from '../../config/backgroundScenes';
import { Sprite, Transform } from '../components';
import type { GameContext } from '../GameContext';

const TIER_BASE = [0, 0.14, 0.3, 0.52] as const;

interface Element {
  readonly entity: number;
  readonly tone: ToneId;
  readonly alpha: number;
  readonly r: number;
  readonly x: number;
  readonly y: number;
  readonly rot: number;
  readonly spin: number;
  readonly breathe: number;
  readonly bspeed: number;
  readonly driftX: number;
  readonly driftY: number;
  readonly dspeed: number;
  readonly phase: number;
  readonly flicker: number;
  readonly fspeed: number;
  readonly react: number;
  readonly glow: number;
  readonly flow: number | null;
  readonly flowTo: number;
  /** Базовая амплитуда звуковой дорожки; у остальных фигур не используется. */
  readonly waveAmp: number;
}

/**
 * Сцена фона собирается из декларативного описания (config/backgroundScenes),
 * а система только анимирует её. Каждая покупка в магазине — своя грамматика кадра,
 * а не тот же набор колец с другой скоростью.
 *
 * Сцена и seed не трогают игровой RNG: реплей и паттерны остаются побитово теми же.
 */
export class BackgroundSystem implements ISystem {
  readonly name = 'Background';
  private elements: Element[] = [];
  private activeBackground = '';
  private activeTheme = '';
  private scene: BackgroundScene = backgroundScene(undefined);
  private readonly salt: number;

  constructor(seed: number, ctx: GameContext) {
    this.salt = this.hash(seed);
    this.rebuild(ctx);
  }

  update(dt: number, ctx: GameContext): void {
    if (this.activeBackground !== ctx.visualBackground || this.activeTheme !== ctx.visualTheme) {
      this.rebuild(ctx);
    }

    const fx = ctx.fx;
    fx.flash = Math.max(0, fx.flash - dt / 190);
    fx.damage = Math.max(0, fx.damage - dt / 420);
    fx.background = damp(fx.background, TIER_BASE[fx.tier], 3.2, dt);

    const theme = visualTheme(ctx.visualTheme);
    const unit = ctx.view.unit;
    const time = ctx.clock.now / 1000;
    const energy = fx.background + fx.flash * 0.55;
    const flowSpeed = this.scene.flowSpeed ?? 0;

    for (const item of this.elements) {
      const transform = ctx.world.require(item.entity, Transform);
      const sprite = ctx.world.require(item.entity, Sprite);

      const driftAngle = time * item.dspeed + item.phase;
      transform.x = ctx.view.cx + (item.x + Math.cos(driftAngle) * item.driftX) * unit;
      transform.y = ctx.view.cy + (item.y + Math.sin(driftAngle) * item.driftY) * unit;

      let radius = item.r;
      let alpha = item.alpha;

      if (item.flow !== null) {
        // Кольцо туннеля: летит из глубины наружу и гаснет на обоих концах.
        const u = (time * flowSpeed + item.flow) % 1;
        const eased = u * u;
        radius = item.r + (item.flowTo - item.r) * eased;
        alpha *= Math.min(1, u * 6) * (1 - Math.max(0, (u - 0.72) / 0.28));
      }

      if (item.breathe !== 0) radius += Math.sin(time * item.bspeed + item.phase) * item.breathe;
      radius += energy * item.react * 0.02;

      if (item.flicker !== 0) {
        const wave = Math.sin(time * item.fspeed + item.phase * 3.1);
        alpha *= 1 - item.flicker + item.flicker * wave * wave;
      }
      alpha *= 1 + energy * item.react * 1.35;
      if (item.tone === 'far' && fx.damage > 0) alpha += fx.damage * 0.08;

      // Волновая дорожка «дышит» амплитудой, а не радиусом.
      if (item.waveAmp > 0) {
        sprite.thickness = item.waveAmp * unit * (0.55 + energy * item.react * 0.9);
      }

      sprite.radius = radius * unit;
      sprite.rotation = item.rot + time * item.spin;
      sprite.glow = item.glow * theme.bloom;

      const color = toneColor(theme, item.tone);
      sprite.color[0] = color[0];
      sprite.color[1] = color[1];
      sprite.color[2] = color[2];
      sprite.color[3] = clamp(alpha, 0, 0.75);
    }
  }

  private rebuild(ctx: GameContext): void {
    for (const item of this.elements) ctx.world.destroyEntity(item.entity);
    this.elements = [];
    this.activeBackground = ctx.visualBackground;
    this.activeTheme = ctx.visualTheme;
    this.scene = backgroundScene(ctx.visualBackground);
    const theme = visualTheme(ctx.visualTheme);

    for (const haze of this.scene.haze) {
      const entity = this.spawn(ctx, theme, haze.tone, {
        shape: SHAPE_GLOW,
        radius: haze.r * ctx.view.unit,
        thickness: 0,
        softness: 2,
        layer: 0,
        param: haze.falloff ?? 2.6,
      });
      this.elements.push(this.element(entity, haze.tone, {
        alpha: haze.alpha, r: haze.r, x: haze.x ?? 0, y: haze.y ?? 0,
        react: haze.react ?? 0, breathe: haze.r * 0.05, bspeed: 0.5,
        phase: this.salt * 6.283,
      }));
    }

    for (const layer of this.scene.layers) {
      const repeat = layer.repeat ?? 1;
      for (let i = 0; i < repeat; i += 1) this.addLayerInstance(ctx, theme, layer, i);
    }
  }

  private addLayerInstance(ctx: GameContext, theme: VisualTheme, layer: SceneLayer, i: number): void {
    const unit = ctx.view.unit;
    const isWave = layer.shape === SHAPE_WAVE;
    const entity = this.spawn(ctx, theme, layer.tone, {
      shape: layer.shape,
      radius: (layer.r + (layer.dr ?? 0) * i) * unit,
      thickness: (layer.t ?? 0.008) * unit,
      softness: layer.soft ?? 1.4,
      layer: (layer.layer ?? 1) + i * 0.01,
      arc: layer.arc,
      count: layer.count,
      param: layer.p1,
      param2: layer.p2 ?? (isWave ? this.salt * 6.283 : undefined),
    });

    this.elements.push(this.element(entity, layer.tone, {
      alpha: Math.max(0, layer.alpha + (layer.dalpha ?? 0) * i),
      r: layer.r + (layer.dr ?? 0) * i,
      x: (layer.x ?? 0) + (layer.dx ?? 0) * i,
      y: (layer.y ?? 0) + (layer.dy ?? 0) * i,
      rot: (layer.rot ?? 0) + (layer.drot ?? 0) * i,
      spin: layer.spin ?? 0,
      breathe: layer.breathe ?? 0,
      bspeed: layer.bspeed ?? 1,
      driftX: layer.driftX ?? 0,
      driftY: layer.driftY ?? 0,
      dspeed: layer.dspeed ?? 0,
      phase: (layer.phase ?? 0) + (layer.dphase ?? 0) * i + this.salt * 0.7,
      flicker: layer.flicker ?? 0,
      fspeed: layer.fspeed ?? 2,
      react: layer.react ?? 0,
      glow: layer.glow ?? 0,
      flow: layer.flow === undefined ? null : layer.flow + (layer.dflow ?? 0) * i,
      flowTo: layer.flowTo ?? layer.r,
      waveAmp: isWave ? layer.t ?? 0.05 : 0,
    }));
  }

  private element(entity: number, tone: ToneId, partial: Partial<Omit<Element, 'entity' | 'tone'>>): Element {
    return {
      entity, tone,
      alpha: partial.alpha ?? 0.1,
      r: partial.r ?? 1,
      x: partial.x ?? 0,
      y: partial.y ?? 0,
      rot: partial.rot ?? 0,
      spin: partial.spin ?? 0,
      breathe: partial.breathe ?? 0,
      bspeed: partial.bspeed ?? 1,
      driftX: partial.driftX ?? 0,
      driftY: partial.driftY ?? 0,
      dspeed: partial.dspeed ?? 0,
      phase: partial.phase ?? 0,
      flicker: partial.flicker ?? 0,
      fspeed: partial.fspeed ?? 2,
      react: partial.react ?? 0,
      glow: partial.glow ?? 0,
      flow: partial.flow ?? null,
      flowTo: partial.flowTo ?? 1,
      waveAmp: partial.waveAmp ?? 0,
    };
  }

  private spawn(
    ctx: GameContext, theme: VisualTheme, tone: ToneId,
    sprite: { shape: ShapeKind; radius: number; thickness: number; softness: number; layer: number; arc?: number; count?: number; param?: number; param2?: number },
  ): number {
    const entity = ctx.world.createEntity();
    const color = toneColor(theme, tone);
    ctx.world.add(entity, Transform, { x: ctx.view.cx, y: ctx.view.cy });
    ctx.world.add(entity, Sprite, {
      shape: sprite.shape,
      radius: sprite.radius,
      thickness: sprite.thickness,
      softness: sprite.softness,
      color: [color[0], color[1], color[2], 0],
      layer: sprite.layer,
      arc: sprite.arc,
      count: sprite.count,
      param: sprite.param,
      param2: sprite.param2,
      glow: 0,
    });
    return entity;
  }

  private hash(value: number): number {
    let n = value >>> 0;
    n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
    n = Math.imul(n ^ (n >>> 16), 0x45d9f3b);
    return ((n ^ (n >>> 16)) >>> 0) / 0x100000000;
  }
}
