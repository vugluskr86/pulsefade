import { gradeFor, worstGrade } from '../../domain/Judgement';
import {
  deadlineFor,
  finishPulse,
  takeNearestDown,
  type IBeatResolver,
  type ResolveContext,
} from './types';

/** Двойной тап: первый — по импульсу, второй — внутри короткого окна. */
export class DoubleResolver implements IBeatResolver {
  readonly kind = 'double' as const;

  resolve(rc: ResolveContext): void {
    const { ctx, pulse, now } = rc;
    const windows = ctx.tuning.windows;
    const target = pulse.beat.targetTime;
    const doubleWindow = ctx.tuning.doubleTapWindowMs;

    if (pulse.taps === 0) {
      const first = takeNearestDown(ctx.inputs, target, windows.ok);
      if (!first) {
        if (now > target + windows.ok) finishPulse(rc, 'miss', null, windows.ok + 1);
        return;
      }
      pulse.taps = 1;
      pulse.firstTapTime = first.time;
      pulse.firstGrade = gradeFor(first.time - target, windows);
      // вторая фаза проверяется тут же: оба нажатия могут прийти в одном кадре
    }

    const secondAt = pulse.firstTapTime + doubleWindow * 0.6;
    const event = takeNearestDown(ctx.inputs, secondAt, doubleWindow * 0.4);
    if (event) {
      const lateness = (event.time - pulse.firstTapTime) / doubleWindow;
      const grade = lateness > 0.75 ? worstGrade(pulse.firstGrade, 'great') : pulse.firstGrade;
      finishPulse(rc, grade, event.time, pulse.firstTapTime - target);
      return;
    }
    if (now > deadlineFor(pulse, ctx.tuning)) {
      finishPulse(rc, 'miss', pulse.firstTapTime, pulse.firstTapTime - target);
    }
  }
}
