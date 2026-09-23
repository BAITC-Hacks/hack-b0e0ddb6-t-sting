import { SCENARIO } from '../simulation/engine/scenario';
import type { DirectionId, Evaluation } from '../simulation/engine/types';
import type { MetricImpact, MetricValues } from './types';
import { ROLE_IDS } from './roles';

/** Keep full precision: rounding is a presentation concern only. */
export function councilMetrics(
  evaluation: Evaluation,
  baseline: Evaluation,
): MetricValues {
  const directions: Record<DirectionId, number> = {
    transport: 0,
    ecology: 0,
    social: 0,
    safety: 0,
    services: 0,
  };
  for (const district of evaluation.districts) {
    const population = SCENARIO.districts.find(
      (item) => item.id === district.districtId,
    )!.population;
    for (const indicator of SCENARIO.indicators)
      directions[indicator.direction] +=
        population * indicator.weight * district.after[indicator.id];
  }
  return {
    ...directions,
    ombudsman: evaluation.weakestScore - evaluation.criticalCells.length,
    finance:
      evaluation.cost === 0
        ? 0
        : (10 * (evaluation.score - baseline.score)) / evaluation.cost,
  };
}

export function metricImpacts(
  before: Evaluation,
  after: Evaluation,
  baseline: Evaluation,
): MetricImpact[] {
  const original = councilMetrics(before, baseline);
  const changed = councilMetrics(after, baseline);
  return ROLE_IDS.map((roleId) => ({
    roleId,
    before: original[roleId],
    after: changed[roleId],
    delta: changed[roleId] - original[roleId],
  }));
}
