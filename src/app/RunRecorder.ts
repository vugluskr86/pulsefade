import type { Beat } from '../domain/Beat';
import type { Grade } from '../domain/Judgement';
import type { Tuning } from '../config/Tuning';
import type { ScriptedInput } from '../input/ScriptedInputProvider';
import type { GameContext } from '../game/GameContext';

export interface BeatRecord {
  readonly beat: Beat;
  readonly grade: Grade;
  readonly hitTime: number | null;
  readonly errorMs: number;
}

export interface ReplayPlan {
  readonly beats: readonly Beat[];
  readonly script: readonly ScriptedInput[];
  readonly length: number;
}

const REPLAY_LEAD_IN = 700;

/** Запись партии: нужна для повтора лучшей серии (GDD §11). */
export class RunRecorder {
  private readonly beats = new Map<number, Beat>();
  private readonly records: BeatRecord[] = [];

  constructor(ctx: GameContext) {
    ctx.bus.on('beatSpawned', ({ beat }) => this.beats.set(beat.index, beat));
    ctx.bus.on('judgement', (event) => {
      if (event.stray) return;
      const beat = this.beats.get(event.beatIndex);
      if (!beat) return;
      this.records.push({
        beat,
        grade: event.grade,
        hitTime: event.hitTime,
        errorMs: event.errorMs,
      });
    });
  }

  /** Самая длинная непрерывная серия без промахов. */
  bestStreak(): BeatRecord[] {
    let best: BeatRecord[] = [];
    let current: BeatRecord[] = [];
    for (const record of this.records) {
      if (record.grade === 'miss') {
        if (current.length > best.length) best = current;
        current = [];
        continue;
      }
      current.push(record);
    }
    return current.length > best.length ? current : best;
  }

  /**
   * Пересобирает серию в самостоятельный раунд: те же удары и те же тапы,
   * сдвинутые к моменту старта повтора.
   */
  buildReplay(tuning: Tuning, startTime: number): ReplayPlan | null {
    const streak = this.bestStreak();
    if (streak.length < 2) return null;

    const first = streak[0] as BeatRecord;
    const offset = startTime + REPLAY_LEAD_IN + first.beat.approachMs - first.beat.targetTime;

    const beats: Beat[] = [];
    const script: ScriptedInput[] = [];

    streak.forEach((record, index) => {
      const targetTime = record.beat.targetTime + offset;
      beats.push({ ...record.beat, index, targetTime });

      const nx = record.beat.kind === 'choice' ? record.beat.side * 0.6 : 0;
      const press =
        record.beat.kind === 'hold'
          ? targetTime
          : (record.hitTime ?? record.beat.targetTime) + offset;

      script.push({ phase: 'down', time: press, nx, x: 0, y: 0 });

      if (record.beat.kind === 'double') {
        const second = press + tuning.doubleTapWindowMs * 0.45;
        script.push({ phase: 'up', time: press + 50, nx, x: 0, y: 0 });
        script.push({ phase: 'down', time: second, nx, x: 0, y: 0 });
        script.push({ phase: 'up', time: second + 50, nx, x: 0, y: 0 });
      } else if (record.beat.kind === 'hold') {
        const release = (record.hitTime ?? targetTime + tuning.holdDurationMs) + offset;
        script.push({ phase: 'up', time: release, nx, x: 0, y: 0 });
      } else {
        script.push({ phase: 'up', time: press + 50, nx, x: 0, y: 0 });
      }
    });

    script.sort((a, b) => a.time - b.time);
    return { beats, script, length: streak.length };
  }
}
