import type { Entity } from '../../core/ecs/World';
import type { BeatKind } from '../../domain/Beat';
import type { Grade } from '../../domain/Judgement';
import type { Tuning } from '../../config/Tuning';
import type { InputEvent } from '../../input/InputEvent';
import type { GameContext } from '../GameContext';
import { Pulse, Transform, type PulseData } from '../components';

export interface ResolveContext {
  readonly ctx: GameContext;
  readonly entity: Entity;
  readonly pulse: PulseData;
  readonly now: number;
}

/**
 * OCP: новое событие из GDD §10 добавляется новым резолвером,
 * JudgeSystem при этом не меняется.
 */
export interface IBeatResolver {
  readonly kind: BeatKind;
  resolve(rc: ResolveContext): void;
}

/** Крайний срок, после которого импульс считается пропущенным. */
export function deadlineFor(pulse: PulseData, tuning: Tuning): number {
  const target = pulse.beat.targetTime;
  switch (pulse.beat.kind) {
    case 'double':
      return target + tuning.windows.ok + tuning.doubleTapWindowMs;
    case 'hold':
      return target + tuning.holdDurationMs + tuning.holdReleaseWindowMs;
    default:
      return target + tuning.windows.ok;
  }
}

/** Забирает ближайшее к моменту неиспользованное нажатие в пределах окна. */
export function takeNearestDown(
  inputs: readonly InputEvent[],
  atTime: number,
  windowMs: number,
): InputEvent | null {
  let best: InputEvent | null = null;
  let bestError = Infinity;
  for (const event of inputs) {
    if (event.consumed || event.phase !== 'down') continue;
    const error = Math.abs(event.time - atTime);
    if (error > windowMs || error >= bestError) continue;
    best = event;
    bestError = error;
  }
  if (best) best.consumed = true;
  return best;
}

export function takeFirstUp(inputs: readonly InputEvent[], afterTime: number): InputEvent | null {
  for (const event of inputs) {
    if (event.consumed || event.phase !== 'up' || event.time < afterTime) continue;
    event.consumed = true;
    return event;
  }
  return null;
}

/** Сторона нажатия для события «два центра». */
export function sideOf(event: InputEvent): -1 | 0 | 1 {
  if (event.nx <= -0.08) return -1;
  if (event.nx >= 0.08) return 1;
  return 0;
}

export function finishPulse(
  rc: ResolveContext,
  grade: Grade,
  hitTime: number | null,
  errorMs: number,
): void {
  const { ctx, entity, pulse, now } = rc;
  pulse.state = 'resolved';
  pulse.resolvedAt = now;
  pulse.grade = grade;
  const transform = ctx.world.get(entity, Transform);
  ctx.bus.emit('judgement', {
    grade,
    errorMs,
    kind: pulse.beat.kind,
    beatIndex: pulse.beat.index,
    targetTime: pulse.beat.targetTime,
    hitTime,
    x: transform?.x ?? ctx.view.cx,
    y: transform?.y ?? ctx.view.cy,
    stray: false,
  });
  if (pulse.aux !== null) {
    ctx.world.destroyEntity(pulse.aux);
    pulse.aux = null;
  }
  void Pulse;
}
