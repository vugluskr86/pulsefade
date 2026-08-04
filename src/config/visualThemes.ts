import type { Rgba } from './palette';

export type VisualThemeId =
  | 'palette_default' | 'palette_fire' | 'palette_ice' | 'palette_toxic' | 'palette_night' | 'palette_neon';

export type BackgroundId =
  | 'background_reactor' | 'background_portal' | 'background_horizon' | 'background_orbit' | 'background_tunnel'
  | 'background_scanner' | 'background_frame' | 'background_eclipse' | 'background_gates' | 'background_constellation';

export type TargetId = 'target_crosshair' | 'target_sectors' | 'target_wander';

export type GradientMotion = 'pulse' | 'breathe' | 'flow' | 'drift' | 'rush' | 'scan' | 'flicker' | 'eclipse' | 'counter' | 'twinkle';

export interface BackgroundPreset {
  readonly scene: number;
  readonly motion: GradientMotion;
  readonly speed: number;
}

export interface TargetPreset {
  readonly crosshair: boolean;
  readonly sectors: boolean;
  readonly wander: boolean;
}

export interface VisualTheme {
  readonly ink: Rgba;
  readonly background: readonly [Rgba, Rgba, Rgba];
  readonly primary: Rgba;
  readonly secondary: Rgba;
  readonly accent: Rgba;
  readonly sector: Rgba;
}

const hex = (value: string, alpha = 1): Rgba => {
  const n = parseInt(value.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, alpha];
};

/** IDs correspond to the palette cosmetics, so a purchased palette changes the playfield. */
export const VISUAL_THEMES: Record<VisualThemeId, VisualTheme> = {
  palette_default: { ink: hex('#07070f'), background: [hex('#1b1246'), hex('#053a58'), hex('#3a123b')], primary: hex('#6ee7ff'), secondary: hex('#9d7bff'), accent: hex('#ffb454'), sector: hex('#e8e6f0') },
  palette_fire: { ink: hex('#170509'), background: [hex('#5d100b'), hex('#3d0717'), hex('#7a3008')], primary: hex('#ff6b45'), secondary: hex('#ff285d'), accent: hex('#ffd166'), sector: hex('#ff9f43') },
  palette_ice: { ink: hex('#04111d'), background: [hex('#07395b'), hex('#12355b'), hex('#134c55')], primary: hex('#5be7ff'), secondary: hex('#9bc8ff'), accent: hex('#effcff'), sector: hex('#79f7df') },
  palette_toxic: { ink: hex('#07130c'), background: [hex('#1c4b1b'), hex('#173d2d'), hex('#3d4c0b')], primary: hex('#94ff4b'), secondary: hex('#35f5b8'), accent: hex('#f1ff4b'), sector: hex('#d1ff78') },
  palette_night: { ink: hex('#050817'), background: [hex('#101b50'), hex('#192a66'), hex('#25124f')], primary: hex('#778cff'), secondary: hex('#a878ff'), accent: hex('#70d6ff'), sector: hex('#c6cbff') },
  palette_neon: { ink: hex('#160515'), background: [hex('#590a51'), hex('#083f5c'), hex('#691135')], primary: hex('#21e6ff'), secondary: hex('#ff31cf'), accent: hex('#ffdc3d'), sector: hex('#ff85dd') },
};

export const BACKGROUND_PRESETS: Record<BackgroundId, BackgroundPreset> = {
  background_reactor: { scene: 0, motion: 'pulse', speed: 1 },
  background_portal: { scene: 1, motion: 'breathe', speed: 0.56 },
  background_horizon: { scene: 2, motion: 'flow', speed: 0.75 },
  background_orbit: { scene: 3, motion: 'drift', speed: 0.48 },
  background_tunnel: { scene: 4, motion: 'rush', speed: 1.25 },
  background_scanner: { scene: 5, motion: 'scan', speed: 1.4 },
  background_frame: { scene: 6, motion: 'flicker', speed: 0.9 },
  background_eclipse: { scene: 7, motion: 'eclipse', speed: 0.34 },
  background_gates: { scene: 8, motion: 'counter', speed: 0.65 },
  background_constellation: { scene: 9, motion: 'twinkle', speed: 0.8 },
};

export const TARGET_PRESETS: Record<TargetId, TargetPreset> = {
  target_crosshair: { crosshair: true, sectors: false, wander: false },
  target_sectors: { crosshair: false, sectors: true, wander: false },
  target_wander: { crosshair: false, sectors: false, wander: true },
};

export function visualTheme(id: string | undefined): VisualTheme {
  return VISUAL_THEMES[id as VisualThemeId] ?? VISUAL_THEMES.palette_default;
}

export function backgroundPreset(id: string | undefined): BackgroundPreset {
  return BACKGROUND_PRESETS[id as BackgroundId] ?? BACKGROUND_PRESETS.background_reactor;
}

export function targetPreset(id: string | undefined): TargetPreset {
  return TARGET_PRESETS[id as TargetId] ?? TARGET_PRESETS.target_crosshair;
}
