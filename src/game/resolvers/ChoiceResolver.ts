import { gradeFor } from '../../domain/Judgement';
import {
  deadlineFor,
  finishPulse,
  sideOf,
  takeNearestDown,
  type IBeatResolver,
  type ResolveContext,
} from './types';

/** «Два центра»: активный помечен подлетающим кольцом, промах по стороне — MISS. */
export class ChoiceResolver implements IBeatResolver {
  readonly kind = 'choice' as const;

  resolve(rc: ResolveContext): void {
    const { ctx, pulse, now } = rc;
    const windows = ctx.tuning.windows;
    const target = pulse.beat.targetTime;

    const event = takeNearestDown(ctx.inputs, target, windows.ok);
    if (event) {
      const error = event.time - target;
      const correctSide = sideOf(event) === pulse.beat.side;
      finishPulse(rc, correctSide ? gradeFor(error, windows) : 'miss', event.time, error);
      return;
    }
    if (now > deadlineFor(pulse, ctx.tuning)) {
      finishPulse(rc, 'miss', null, windows.ok + 1);
    }
  }
}
