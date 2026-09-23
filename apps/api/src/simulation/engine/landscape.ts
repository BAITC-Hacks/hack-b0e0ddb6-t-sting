import { PLAN_OPTIONS } from './options';
import { SCENARIO } from './scenario';
import { scorePlan } from './scoring';
import type { DirectionId, Plan, Review } from './types';

export interface Landscape {
  scores: Float64Array;
  optimum: Review['optimum'];
  histogram: Review['histogram'];
}

export const SCORE_TOLERANCE = 1e-9;
const HISTOGRAM_STEP = 0.25;

/** Combinations prevent duplicate measures and order permutations by construction. */
export function buildLandscape(): Landscape {
  const scores: number[] = [];
  let optimum: Review['optimum'] = { score: -Infinity, plan: [] };
  const chosen: number[] = [];
  const directions: Record<DirectionId, number> = {
    transport: 0,
    ecology: 0,
    social: 0,
    safety: 0,
    services: 0,
  };
  const plan: Plan = [];

  function assignDistricts(depth: number) {
    if (depth === 5) {
      const score = scorePlan(plan);
      scores.push(score);
      if (score > optimum.score + SCORE_TOLERANCE)
        optimum = { score, plan: plan.map((item) => ({ ...item })) };
      return;
    }
    for (const option of PLAN_OPTIONS[chosen[depth]]) {
      const incompatible = SCENARIO.incompatibilities.some(
        (conflict) =>
          conflict.sameDistrictOnly &&
          conflict.measureIds.includes(option.measureId) &&
          plan.some(
            (item) =>
              conflict.measureIds.includes(item.measureId) &&
              item.districtId === option.districtId,
          ),
      );
      if (incompatible) continue;
      plan.push(option);
      assignDistricts(depth + 1);
      plan.pop();
    }
  }

  function chooseMeasures(start: number, cost: number) {
    if (chosen.length === 5) {
      assignDistricts(0);
      return;
    }
    for (
      let index = start;
      index <= SCENARIO.measures.length - (5 - chosen.length);
      index++
    ) {
      const measure = SCENARIO.measures[index];
      if (
        cost + measure.cost > SCENARIO.budget ||
        directions[measure.direction] === 2
      )
        continue;
      if (
        SCENARIO.incompatibilities.some(
          (conflict) =>
            !conflict.sameDistrictOnly &&
            conflict.measureIds.includes(measure.id) &&
            chosen.some((selected) =>
              conflict.measureIds.includes(SCENARIO.measures[selected].id),
            ),
        )
      )
        continue;
      chosen.push(index);
      directions[measure.direction]++;
      chooseMeasures(index + 1, cost + measure.cost);
      directions[measure.direction]--;
      chosen.pop();
    }
  }
  chooseMeasures(0, 0);
  const sorted = new Float64Array(scores).sort();
  const minimum = Math.floor(sorted[0] / HISTOGRAM_STEP) * HISTOGRAM_STEP;
  const maximum = sorted[sorted.length - 1];
  const histogram = Array.from(
    { length: Math.floor((maximum - minimum) / HISTOGRAM_STEP) + 1 },
    (_, index) => ({
      from: minimum + index * HISTOGRAM_STEP,
      to: minimum + (index + 1) * HISTOGRAM_STEP,
      count: 0,
    }),
  );
  for (const score of sorted)
    histogram[Math.floor((score - minimum) / HISTOGRAM_STEP)].count++;
  return { scores: sorted, optimum, histogram };
}

/** Equal scores share a competition rank; tolerance removes floating-point tie noise. */
export function rankOf(landscape: Landscape, score: number): number {
  let low = 0;
  let high = landscape.scores.length;
  while (low < high) {
    const middle = Math.floor((low + high) / 2);
    if (landscape.scores[middle] <= score + SCORE_TOLERANCE) low = middle + 1;
    else high = middle;
  }
  return landscape.scores.length - low + 1;
}
