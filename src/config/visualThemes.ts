import type { Rgba } from './palette';

export type VisualThemeId =
  | 'palette_default' | 'palette_fire' | 'palette_ice' | 'palette_toxic' | 'palette_night' | 'palette_neon';

export type BackgroundId =
  | 'background_reactor' | 'background_portal' | 'background_horizon' | 'background_orbit' | 'background_tunnel'
  | 'background_scanner' | 'background_frame' | 'background_eclipse' | 'background_gates' | 'background_constellation';

export type TargetId = 'target_crosshair' | 'target_sectors' | 'target_wander';

export interface VisualTheme {
  /** Цвет заливки кадра — почти чёрный, объём даёт дымка. */
  readonly ink: Rgba;
  /** Три тона объёмной дымки: дальний, средний, ближний. */
  readonly haze: readonly [Rgba, Rgba, Rgba];
  readonly primary: Rgba;
  readonly secondary: Rgba;
  readonly accent: Rgba;
  readonly sector: Rgba;
  /** Горячий (почти белый) тон для ядра ярких колец. */
  readonly hot: Rgba;
  /** Общий множитель силы неонового ореола палитры. */
  readonly bloom: number;
}

const hex = (value: string, alpha = 1): Rgba => {
  const n = parseInt(value.slice(1), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255, alpha];
};

/**
 * Палитры собраны по референс-артам: почти чёрная база, крупная цветная дымка
 * и три-четыре чистых неоновых тона, которые не смешиваются в грязь при аддитивном блендинге.
 */
export const VISUAL_THEMES: Record<VisualThemeId, VisualTheme> = {
  palette_default: {
    ink: hex('#080410'),
    haze: [hex('#2b0f4e'), hex('#0a2d5c'), hex('#4a0f3c')],
    primary: hex('#4fd8ff'), secondary: hex('#a86bff'), accent: hex('#ffc24a'), sector: hex('#e6e2ff'),
    hot: hex('#f4fbff'), bloom: 1,
  },
  palette_fire: {
    ink: hex('#110207'),
    haze: [hex('#5e0d10'), hex('#7d2a04'), hex('#3d0416')],
    primary: hex('#ff7a3c'), secondary: hex('#ff2d55'), accent: hex('#ffd166'), sector: hex('#ffb37a'),
    hot: hex('#fff2e0'), bloom: 1.2,
  },
  palette_ice: {
    ink: hex('#020a16'),
    haze: [hex('#07294c'), hex('#0b3c54'), hex('#101f4e')],
    primary: hex('#57e8ff'), secondary: hex('#9dc6ff'), accent: hex('#eafcff'), sector: hex('#7cf5dd'),
    hot: hex('#ffffff'), bloom: 1.05,
  },
  palette_toxic: {
    ink: hex('#030d08'),
    haze: [hex('#0f3d1c'), hex('#16402e'), hex('#3d4a06')],
    primary: hex('#9dff4a'), secondary: hex('#2ff5b6'), accent: hex('#f2ff4a'), sector: hex('#d6ff85'),
    hot: hex('#f4ffe6'), bloom: 1.1,
  },
  palette_night: {
    ink: hex('#02040d'),
    haze: [hex('#0d1442'), hex('#131f5c'), hex('#23104e')],
    primary: hex('#6f86ff'), secondary: hex('#a86bff'), accent: hex('#6fd6ff'), sector: hex('#c4c9ff'),
    hot: hex('#eef1ff'), bloom: 0.85,
  },
  /** Ближе всего к референсам: бордовая дымка, циан, маджента и жёлтый. */
  palette_neon: {
    ink: hex('#100208'),
    haze: [hex('#5a0a28'), hex('#07304f'), hex('#3f0736')],
    primary: hex('#21e6ff'), secondary: hex('#ff2d9b'), accent: hex('#ffd400'), sector: hex('#ff7ad2'),
    hot: hex('#ffffff'), bloom: 1.35,
  },
};

export interface TargetPreset {
  readonly crosshair: boolean;
  readonly sectors: boolean;
  readonly wander: boolean;
}

export const TARGET_PRESETS: Record<TargetId, TargetPreset> = {
  target_crosshair: { crosshair: true, sectors: false, wander: false },
  target_sectors: { crosshair: false, sectors: true, wander: false },
  target_wander: { crosshair: false, sectors: false, wander: true },
};

export function visualTheme(id: string | undefined): VisualTheme {
  return VISUAL_THEMES[id as VisualThemeId] ?? VISUAL_THEMES.palette_default;
}

export function targetPreset(id: string | undefined): TargetPreset {
  return TARGET_PRESETS[id as TargetId] ?? TARGET_PRESETS.target_crosshair;
}

export type ToneId = 'far' | 'mid' | 'near' | 'primary' | 'secondary' | 'accent' | 'sector' | 'hot';

export function toneColor(theme: VisualTheme, tone: ToneId): Rgba {
  switch (tone) {
    case 'far': return theme.haze[0];
    case 'mid': return theme.haze[1];
    case 'near': return theme.haze[2];
    case 'secondary': return theme.secondary;
    case 'accent': return theme.accent;
    case 'sector': return theme.sector;
    case 'hot': return theme.hot;
    default: return theme.primary;
  }
}
