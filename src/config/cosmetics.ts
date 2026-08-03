export type CosmeticCategory = 'palette' | 'particles' | 'sound';

export interface CosmeticItem {
  readonly id: string;
  readonly category: CosmeticCategory;
  readonly title: string;
  readonly description: string;
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
    title: 'Стандарт',
    description: 'Сине-фиолетовая палитра по умолчанию',
    price: 0,
  },
  {
    id: 'palette_fire',
    category: 'palette',
    title: 'Огонь',
    description: 'Оранжево-красные тона',
    price: 500,
  },
  {
    id: 'palette_ice',
    category: 'palette',
    title: 'Лёд',
    description: 'Голубо-белые холодные тона',
    price: 800,
  },
  {
    id: 'palette_toxic',
    category: 'palette',
    title: 'Токсин',
    description: 'Зелёно-жёлтые кислотные тона',
    price: 1000,
  },
  {
    id: 'palette_night',
    category: 'palette',
    title: 'Ночь',
    description: 'Тёмно-синие глубокие тона',
    price: 2000,
  },
  {
    id: 'palette_neon',
    category: 'palette',
    title: 'Неон',
    description: 'Розово-циановые яркие тона',
    price: 4000,
  },
];

/** 4 набора частиц. */
export const PARTICLE_SETS: readonly CosmeticItem[] = [
  {
    id: 'particles_default',
    category: 'particles',
    title: 'Импульсы',
    description: 'Стандартные частицы',
    price: 0,
  },
  {
    id: 'particles_spark',
    category: 'particles',
    title: 'Искры',
    description: 'Яркие искры при попадании',
    price: 3000,
  },
  {
    id: 'particles_rings',
    category: 'particles',
    title: 'Кольца',
    description: 'Расходящиеся кольца при PERFECT',
    price: 4500,
  },
  {
    id: 'particles_void',
    category: 'particles',
    title: 'Пустота',
    description: 'Тёмные частицы с фиолетовым свечением',
    price: 6000,
  },
];

/** 3 варианта звукового отклика. */
export const SOUND_SETS: readonly CosmeticItem[] = [
  {
    id: 'sound_default',
    category: 'sound',
    title: 'Щелчки',
    description: 'Стандартные синтезированные щелчки',
    price: 0,
  },
  {
    id: 'sound_chime',
    category: 'sound',
    title: 'Колокольчики',
    description: 'Мелодичные перезвоны',
    price: 4000,
  },
  {
    id: 'sound_techno',
    category: 'sound',
    title: 'Техно',
    description: 'Электронные ритмичные щелчки',
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
