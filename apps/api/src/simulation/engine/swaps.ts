import { PLAN_OPTIONS } from './options';
import { SCORE_TOLERANCE } from './landscape';
import { scorePlan } from './scoring';
import { validatePlan } from './validation';
import type { Plan, Swap } from './types';

/** Includes changing a measure's district as a one-move alternative. */
export function findBestSwaps(plan: Plan, limit = Infinity): Swap[] {
  const current = scorePlan(plan);
  const swaps: Swap[] = [];
  for (const [index, replace] of plan.entries()) {
    for (const option of PLAN_OPTIONS.flat()) {
      if (
        replace.measureId === option.measureId &&
        replace.districtId === option.districtId
      )
        continue;
      const candidate = [...plan];
      candidate[index] = option;
      if (validatePlan(candidate).length > 0) continue;
      const scoreAfter = scorePlan(candidate);
      const gain = scoreAfter - current;
      if (gain > SCORE_TOLERANCE)
        swaps.push({ replace, with: option, scoreAfter, gain });
    }
  }
  return swaps.sort((a, b) => b.gain - a.gain).slice(0, Math.max(0, limit));
}
