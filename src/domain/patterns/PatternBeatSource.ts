import type { IRng } from '../../core/math/Rng';
import { clamp } from '../../core/math/util';
import type { ModeDefinition } from '../../config/modes';
import type { Tuning } from '../../config/Tuning';
import type { Beat, BeatKind, IBeatSource } from '../Beat';
import { getPattern, PATTERNS, type BeatStep } from './library';

/** Жёсткие границы, чтобы «двойной удар» и пауза оставались играбельными. */
const ABSOLUTE_MIN_INTERVAL = 175;
const ABSOLUTE_MAX_INTERVAL = 2200;

interface QueuedStep {
  step: BeatStep;
  patternId: string;
}

export interface PatternSourceOptions {
  readonly rng: IRng;
  readonly mode: ModeDefinition;
  readonly tuning: Tuning;
  readonly startTime: number;
  /** Пауза перед первым импульсом, чтобы игрок увидел подлёт кольца. */
  readonly leadInMs?: number;
}

/**
 * Темп меняется короткими паттернами, а не чистым RNG (GDD §6).
 * При одинаковом seed последовательность полностью воспроизводима — это основа Duel и реплея.
 */
export class PatternBeatSource implements IBeatSource {
  private readonly rng: IRng;
  private readonly mode: ModeDefinition;
  private readonly tuning: Tuning;
  private readonly queue: QueuedStep[] = [];
  private readonly weighted: { id: string; weight: number }[];
  private totalWeight = 0;
  private base: number;
  private time: number;
  private index = 0;
  private leadIn: number;

  constructor(options: PatternSourceOptions) {
    this.rng = options.rng;
    this.mode = options.mode;
    this.tuning = options.tuning;
    this.base = options.mode.baseIntervalMs;
    this.time = options.startTime;
    this.leadIn = options.leadInMs ?? 1200;
    this.weighted = Object.entries(options.mode.patternWeights)
      .filter(([id, weight]) => weight > 0 && id in PATTERNS)
      .map(([id, weight]) => ({ id, weight }));
    for (const entry of this.weighted) this.totalWeight += entry.weight;
  }

  next(): Beat {
    if (this.queue.length === 0) this.enqueuePattern();
    const queued = this.queue.shift() as QueuedStep;

    this.base = clamp(
      this.base * this.mode.driftPerBeat,
      this.mode.minIntervalMs,
      this.mode.maxIntervalMs,
    );

    const interval = clamp(
      this.base * queued.step.factor,
      ABSOLUTE_MIN_INTERVAL,
      ABSOLUTE_MAX_INTERVAL,
    );

    this.time += interval + this.leadIn;
    this.leadIn = 0;

    const kind = this.rollKind(queued.step);
    if (kind === 'hold') this.reserveRoom(this.tuning.holdDurationMs + 340);
    if (kind === 'double') this.reserveRoom(this.tuning.doubleTapWindowMs + 260);

    const approachMs = this.tuning.approachFollowsInterval
      ? clamp(interval, this.tuning.minApproachMs, this.tuning.maxApproachMs)
      : this.tuning.approachMs;

    const beat: Beat = {
      index: this.index++,
      targetTime: this.time,
      interval,
      approachMs,
      kind,
      telegraph: queued.step.telegraph,
      side: kind === 'choice' ? this.rng.sign() : 0,
      patternId: queued.patternId,
    };
    return beat;
  }

  private enqueuePattern(): void {
    const pattern = getPattern(this.pickPatternId());
    // Лёгкое блуждание базы между паттернами — темп «дышит», но остаётся в коридоре режима.
    const wander = this.mode.wander;
    if (wander > 0) {
      this.base = clamp(
        this.base * this.rng.range(1 - wander, 1 + wander),
        this.mode.minIntervalMs,
        this.mode.maxIntervalMs,
      );
    }
    for (const step of pattern.steps) this.queue.push({ step, patternId: pattern.id });
  }

  private pickPatternId(): string {
    if (this.weighted.length === 0) return 'steady';
    let roll = this.rng.next() * this.totalWeight;
    for (const entry of this.weighted) {
      roll -= entry.weight;
      if (roll <= 0) return entry.id;
    }
    return this.weighted[this.weighted.length - 1]!.id;
  }

  private rollKind(step: BeatStep): BeatKind {
    const mode = this.mode;
    if (mode.eventChance <= 0) return 'tap';
    if (this.index < mode.eventsFromBeat) return 'tap';
    if (step.telegraph === 'burst') return 'tap';
    if (this.rng.next() >= mode.eventChance) return 'tap';
    const roll = this.rng.next();
    if (roll < 0.4) return 'double';
    if (roll < 0.75) return 'choice';
    return 'hold';
  }

  /** Гарантирует «воздух» после сложного события: следующий шаг растягивается. */
  private reserveRoom(requiredMs: number): void {
    const factor = requiredMs / this.base;
    const head = this.queue[0];
    if (!head) {
      this.queue.push({ step: { factor, telegraph: 'pause' }, patternId: 'recovery' });
      return;
    }
    if (head.step.factor < factor) {
      this.queue[0] = {
        step: { factor, telegraph: 'pause' },
        patternId: head.patternId,
      };
    }
  }
}

/** Источник для повтора записанной серии (GDD §11). */
export class RecordedBeatSource implements IBeatSource {
  private cursor = 0;
  constructor(private readonly beats: readonly Beat[]) {}

  next(): Beat | null {
    return this.cursor < this.beats.length ? (this.beats[this.cursor++] as Beat) : null;
  }
}
