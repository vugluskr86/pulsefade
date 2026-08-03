import { gradeFor, worstGrade } from '../../domain/Judgement';
import {
  deadlineFor,
  finishPulse,
  takeFirstUp,
  takeNearestDown,
  type IBeatResolver,
  type ResolveContext,
} from './types';

/** Удержание на один импульс: важны и нажатие, и момент отпускания. */
export class HoldResolver implements IBeatResolver {
  readonly kind = 'hold' as const;

  resolve(rc: ResolveContext): void {
    const { ctx, pulse, now } = rc;
    const windows = ctx.tuning.windows;
    const target = pulse.beat.targetTime;

    if (pulse.holdStartedAt === null) {
      const event = takeNearestDown(ctx.inputs, target, windows.ok);
      if (event) {
        pulse.holdStartedAt = event.time;
        pulse.firstGrade = gradeFor(event.time - target, windows);
        return;
      }
      if (now > target + windows.ok) finishPulse(rc, 'miss', null, windows.ok + 1);
      return;
    }

    const releaseAt = target + ctx.tuning.holdDurationMs;
    const release = takeFirstUp(ctx.inputs, pulse.holdStartedAt);
    if (release) {
      const error = release.time - releaseAt;
      const releaseGrade =
        Math.abs(error) > ctx.tuning.holdReleaseWindowMs ? 'miss' : gradeFor(error, windows);
      finishPulse(rc, worstGrade(pulse.firstGrade, releaseGrade), release.time, error);
      return;
    }
    if (now > deadlineFor(pulse, ctx.tuning)) {
      finishPulse(rc, 'miss', null, ctx.tuning.holdReleaseWindowMs + 1);
    }
  }
}
