import { scorePlan } from './scoring';
import type { Plan } from './types';

/** Exact Shapley attribution over every coalition, including critical-cell penalties. */
export function contributions(plan: Plan): number[] {
  const n = plan.length;
  const factorial = [1];
  for (let i = 1; i <= n; i++) factorial[i] = factorial[i - 1] * i;
  const scores: number[] = [];
  const sizes: number[] = [];
  for (let mask = 0; mask < 2 ** n; mask++) {
    const subset = plan.filter((_, index) => (mask & (1 << index)) !== 0);
    scores[mask] = scorePlan(subset);
    sizes[mask] = subset.length;
  }
  return plan.map((_, index) => {
    let result = 0;
    for (let mask = 0; mask < 2 ** n; mask++) {
      if ((mask & (1 << index)) !== 0) continue;
      const size = sizes[mask];
      const weight = (factorial[size] * factorial[n - size - 1]) / factorial[n];
      result += weight * (scores[mask | (1 << index)] - scores[mask]);
    }
    return result;
  });
}
