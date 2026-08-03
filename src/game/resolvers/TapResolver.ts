import { gradeFor } from '../../domain/Judgement';
import { deadlineFor, finishPulse, takeNearestDown, type IBeatResolver, type ResolveContext } from './types';

/** Базовое одно нажатие — ядро прототипа (GDD §5). */
export class TapResolver implements IBeatResolver {
  readonly kind = 'tap' as const;

  resolve(rc: ResolveContext): void {
    const { ctx, pulse, now } = rc;
    const windows = ctx.tuning.windows;
    const target = pulse.beat.targetTime;

    const event = takeNearestDown(ctx.inputs, target, windows.ok);
    if (event) {
      const error = event.time - target;
      finishPulse(rc, gradeFor(error, windows), event.time, error);
      return;
    }
    if (now > deadlineFor(pulse, ctx.tuning)) {
      finishPulse(rc, 'miss', null, windows.ok + 1);
    }
  }
}
