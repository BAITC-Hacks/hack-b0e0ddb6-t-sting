import {
  Injectable,
  UnprocessableEntityException,
  type OnModuleInit,
} from '@nestjs/common';
import { buildLandscape, rankOf, type Landscape } from './engine/landscape';
import { gradeMoves } from './engine/moves';
import { SCENARIO } from './engine/scenario';
import { applyPlan } from './engine/scoring';
import { findBestSwaps } from './engine/swaps';
import { inspectPlan } from './engine/validation';
import type {
  Evaluation,
  Plan,
  Review,
  Scenario,
  Validation,
} from './engine/types';

@Injectable()
export class SimulationService implements OnModuleInit {
  private landscape?: Landscape;
  private readonly baseline = applyPlan([]);

  onModuleInit(): void {
    this.landscape ??= buildLandscape();
  }

  scenario(): Scenario {
    return { ...SCENARIO, baseline: this.baseline };
  }

  validate(plan: Plan): Validation {
    return inspectPlan(plan);
  }

  evaluate(plan: Plan): Evaluation {
    const validation = this.validate(plan);
    if (validation.violations.length > 0)
      throw new UnprocessableEntityException({
        message: 'План нарушает правила сценария.',
        violations: validation.violations,
      });
    return applyPlan(plan);
  }

  review(plan: Plan): Review {
    const evaluation = this.evaluate(plan);
    this.onModuleInit();
    const landscape = this.landscape!;
    const rank = rankOf(landscape, evaluation.score);
    const totalPlans = landscape.scores.length;
    const swaps = findBestSwaps(plan);
    return {
      evaluation,
      baselineScore: this.baseline.score,
      scoreDelta: evaluation.score - this.baseline.score,
      optimumGap: landscape.optimum.score - evaluation.score,
      rank,
      totalPlans,
      percentile: (100 * (totalPlans - rank)) / totalPlans,
      efficiency:
        (100 * (evaluation.score - this.baseline.score)) /
        (landscape.optimum.score - this.baseline.score),
      optimum: landscape.optimum,
      moves: gradeMoves(plan, swaps),
      topSwaps: swaps.slice(0, 3),
      histogram: landscape.histogram,
    };
  }
}
