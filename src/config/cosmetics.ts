export type CosmeticCategory = 'palette' | 'background' | 'target' | 'particles' | 'sound';

export interface CosmeticItem {
  readonly id: string;
  readonly category: CosmeticCategory;
  readonly titleKey: string;
  readonly descKey: string;
  readonly price: number;
}

export interface CosmeticState {
  readonly owned: readonly string[];
  readonly selected: {
    palette: string;
    background: string;
    target: string;
    particles: string;
    sound: string;
  };
}

/** 6 палитр кольца/фона. */
export const PALETTES: readonly CosmeticItem[] = [
  {
    id: 'palette_default',
    category: 'palette',
    titleKey: 'cosmetic.palette_default.title',
    descKey: 'cosmetic.palette_default.desc',
    price: 0,
  },
  {
    id: 'palette_fire',
    category: 'palette',
    titleKey: 'cosmetic.palette_fire.title',
    descKey: 'cosmetic.palette_fire.desc',
    price: 500,
  },
  {
    id: 'palette_ice',
    category: 'palette',
    titleKey: 'cosmetic.palette_ice.title',
    descKey: 'cosmetic.palette_ice.desc',
    price: 800,
  },
  {
    id: 'palette_toxic',
    category: 'palette',
    titleKey: 'cosmetic.palette_toxic.title',
    descKey: 'cosmetic.palette_toxic.desc',
    price: 1000,
  },
  {
    id: 'palette_night',
    category: 'palette',
    titleKey: 'cosmetic.palette_night.title',
    descKey: 'cosmetic.palette_night.desc',
    price: 2000,
  },
  {
    id: 'palette_neon',
    category: 'palette',
    titleKey: 'cosmetic.palette_neon.title',
    descKey: 'cosmetic.palette_neon.desc',
    price: 4000,
  },
];

/** Ten animated playfield scenes, derived from the neon target references. */
export const BACKGROUND_SETS: readonly CosmeticItem[] = [
  { id: 'background_reactor', category: 'background', titleKey: 'cosmetic.background_reactor.title', descKey: 'cosmetic.background_reactor.desc', price: 0 },
  { id: 'background_portal', category: 'background', titleKey: 'cosmetic.background_portal.title', descKey: 'cosmetic.background_portal.desc', price: 600 },
  { id: 'background_horizon', category: 'background', titleKey: 'cosmetic.background_horizon.title', descKey: 'cosmetic.background_horizon.desc', price: 900 },
  { id: 'background_orbit', category: 'background', titleKey: 'cosmetic.background_orbit.title', descKey: 'cosmetic.background_orbit.desc', price: 1200 },
  { id: 'background_tunnel', category: 'background', titleKey: 'cosmetic.background_tunnel.title', descKey: 'cosmetic.background_tunnel.desc', price: 1600 },
  { id: 'background_scanner', category: 'background', titleKey: 'cosmetic.background_scanner.title', descKey: 'cosmetic.background_scanner.desc', price: 2000 },
  { id: 'background_frame', category: 'background', titleKey: 'cosmetic.background_frame.title', descKey: 'cosmetic.background_frame.desc', price: 2400 },
  { id: 'background_eclipse', category: 'background', titleKey: 'cosmetic.background_eclipse.title', descKey: 'cosmetic.background_eclipse.desc', price: 2800 },
  { id: 'background_gates', category: 'background', titleKey: 'cosmetic.background_gates.title', descKey: 'cosmetic.background_gates.desc', price: 3200 },
  { id: 'background_constellation', category: 'background', titleKey: 'cosmetic.background_constellation.title', descKey: 'cosmetic.background_constellation.desc', price: 3600 },
];

/** Three target animation styles. */
export const TARGET_SETS: readonly CosmeticItem[] = [
  { id: 'target_crosshair', category: 'target', titleKey: 'cosmetic.target_crosshair.title', descKey: 'cosmetic.target_crosshair.desc', price: 0 },
  { id: 'target_sectors', category: 'target', titleKey: 'cosmetic.target_sectors.title', descKey: 'cosmetic.target_sectors.desc', price: 1200 },
  { id: 'target_wander', category: 'target', titleKey: 'cosmetic.target_wander.title', descKey: 'cosmetic.target_wander.desc', price: 1800 },
];

/** 4 набора частиц. */
export const PARTICLE_SETS: readonly CosmeticItem[] = [
  {
    id: 'particles_default',
    category: 'particles',
    titleKey: 'cosmetic.particles_default.title',
    descKey: 'cosmetic.particles_default.desc',
    price: 0,
  },
  {
    id: 'particles_spark',
    category: 'particles',
    titleKey: 'cosmetic.particles_spark.title',
    descKey: 'cosmetic.particles_spark.desc',
    price: 3000,
  },
  {
    id: 'particles_rings',
    category: 'particles',
    titleKey: 'cosmetic.particles_rings.title',
    descKey: 'cosmetic.particles_rings.desc',
    price: 4500,
  },
  {
    id: 'particles_void',
    category: 'particles',
    titleKey: 'cosmetic.particles_void.title',
    descKey: 'cosmetic.particles_void.desc',
    price: 6000,
  },
];

/** 3 варианта звукового отклика. */
export const SOUND_SETS: readonly CosmeticItem[] = [
  {
    id: 'sound_default',
    category: 'sound',
    titleKey: 'cosmetic.sound_default.title',
    descKey: 'cosmetic.sound_default.desc',
    price: 0,
  },
  {
    id: 'sound_chime',
    category: 'sound',
    titleKey: 'cosmetic.sound_chime.title',
    descKey: 'cosmetic.sound_chime.desc',
    price: 4000,
  },
  {
    id: 'sound_techno',
    category: 'sound',
    titleKey: 'cosmetic.sound_techno.title',
    descKey: 'cosmetic.sound_techno.desc',
    price: 8000,
  },
];

export const ALL_COSMETICS: readonly CosmeticItem[] = [
  ...PALETTES,
  ...BACKGROUND_SETS,
  ...TARGET_SETS,
  ...PARTICLE_SETS,
  ...SOUND_SETS,
];

const COSMETICS_BY_ID = new Map(ALL_COSMETICS.map((c) => [c.id, c]));

export function getCosmetic(id: string): CosmeticItem | undefined {
  return COSMETICS_BY_ID.get(id);
}

export function createInitialCosmeticState(): CosmeticState {
  return {
    owned: ['palette_default', 'background_reactor', 'target_crosshair', 'particles_default', 'sound_default'],
    selected: {
      palette: 'palette_default',
      background: 'background_reactor',
      target: 'target_crosshair',
      particles: 'particles_default',
      sound: 'sound_default',
    },
  };
}

export function loadCosmeticState(): CosmeticState {
  try {
    const raw = localStorage.getItem('pulsefade:cosmetics');
    if (raw) {
      const parsed = JSON.parse(raw) as CosmeticState;
      if (parsed && parsed.owned && parsed.selected) {
        return {
          owned: [...new Set([...parsed.owned, 'background_reactor', 'target_crosshair'])],
          selected: {
            palette: parsed.selected.palette ?? 'palette_default',
            background: parsed.selected.background ?? 'background_reactor',
            target: parsed.selected.target ?? 'target_crosshair',
            particles: parsed.selected.particles ?? 'particles_default',
            sound: parsed.selected.sound ?? 'sound_default',
          },
        };
      }
    }
  } catch {
    /* игнорируем */
  }
  return createInitialCosmeticState();
}

export function saveCosmeticState(state: CosmeticState): void {
  try {
    localStorage.setItem('pulsefade:cosmetics', JSON.stringify(state));
  } catch {
    /* игнорируем */
  }
}

export function canBuy(item: CosmeticItem, state: CosmeticState, balance: number): boolean {
  return !state.owned.includes(item.id) && balance >= item.price;
}

export function buyCosmetic(item: CosmeticItem, state: CosmeticState): CosmeticState {
  if (state.owned.includes(item.id)) return state;
  return { ...state, owned: [...state.owned, item.id] };
}

export function selectCosmetic(
  state: CosmeticState,
  category: CosmeticCategory,
  id: string,
): CosmeticState {
  if (!state.owned.includes(id)) return state;
  return { ...state, selected: { ...state.selected, [category]: id } };
}
