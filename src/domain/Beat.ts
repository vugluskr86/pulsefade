/** Тип импульса. Базовый прототип — только 'tap' (GDD §10: события включаются позже). */
export type BeatKind = 'tap' | 'double' | 'hold' | 'choice';

/** Что кольцо сообщает игроку заранее (GDD §12 — сначала ощущается, потом требует реакции). */
export type Telegraph = 'steady' | 'faster' | 'slower' | 'pause' | 'burst';

export interface Beat {
  readonly index: number;
  /** Игровое время удара, мс. */
  readonly targetTime: number;
  /** Интервал до предыдущего удара, мс. */
  readonly interval: number;
  /** Сколько кольцо летит к центру. */
  readonly approachMs: number;
  readonly kind: BeatKind;
  readonly telegraph: Telegraph;
  /** Для 'choice': -1 — левый центр, 1 — правый. Иначе 0. */
  readonly side: -1 | 0 | 1;
  readonly patternId: string;
}

/** DIP: спавнер знает только этот интерфейс — живая партия и реплей взаимозаменяемы. */
export interface IBeatSource {
  next(): Beat | null;
}
