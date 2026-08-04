export type CosmeticCategory = 'palette' | 'particles' | 'sound';

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
  ...PARTICLE_SETS,
  ...SOUND_SETS,
];

const COSMETICS_BY_ID = new Map(ALL_COSMETICS.map((c) => [c.id, c]));

export function getCosmetic(id: string): CosmeticItem | undefined {
  return COSMETICS_BY_ID.get(id);
}

export function createInitialCosmeticState(): CosmeticState {
  return {
    owned: ['palette_default', 'particles_default', 'sound_default'],
    selected: {
      palette: 'palette_default',
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
      if (parsed && parsed.owned && parsed.selected) return parsed;
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
