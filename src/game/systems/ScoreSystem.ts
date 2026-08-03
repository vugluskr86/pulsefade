import type { ISystem } from '../../core/ecs/System';
import type { IScoreRules } from '../../domain/Scoring';
import { streakTier } from '../../domain/Scoring';
import type { GameContext } from '../GameContext';

/** Счёт и combo. Правила подсчёта инжектируются (DIP), система их не знает. */
export class ScoreSystem implements ISystem {
  readonly name = 'Score';

  constructor(ctx: GameContext, rules: IScoreRules) {
    ctx.bus.on('judgement', (event) => {
      rules.apply(ctx.score, event.grade);
      if (event.grade === 'miss' && !event.stray) ctx.round.misses += 1;
      ctx.fx.tier = streakTier(ctx.score.combo);
    });
  }

  update(): void {
    // состояние обновляется по событиям
  }
}
