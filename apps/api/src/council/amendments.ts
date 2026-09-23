import { PLAN_OPTIONS } from '../simulation/engine/options';
import { applyPlan } from '../simulation/engine/scoring';
import { inspectPlan, validatePlan } from '../simulation/engine/validation';
import type { Plan, PlanItem } from '../simulation/engine/types';
import { metricImpacts } from './metrics';
import type { Amendment, CouncilContext, PackageCheck } from './types';

const itemKey = (item: PlanItem) =>
  `${item.measureId}@${item.districtId ?? 'city'}`;

/** Enumerate every legal one-item change once, including a new district for the same measure. */
export function allAmendments(
  plan: Plan,
  baseline: CouncilContext['baseline'],
  current: CouncilContext['evaluation'],
): Amendment[] {
  const result: Amendment[] = [];
  for (const [index, replace] of plan.entries()) {
    for (const option of PLAN_OPTIONS.flat()) {
      if (itemKey(replace) === itemKey(option)) continue;
      const candidate = plan.map((item, position) =>
        position === index ? option : item,
      );
      if (validatePlan(candidate).length > 0) continue;
      const evaluation = applyPlan(candidate);
      result.push({
        id: `swap:${itemKey(replace)}>${itemKey(option)}`,
        replace,
        with: option,
        plan: candidate,
        scoreAfter: evaluation.score,
        delta: evaluation.score - current.score,
        cost: evaluation.cost,
        impacts: metricImpacts(current, evaluation, baseline),
      });
    }
  }
  return result;
}

/** Rebuild and validate the complete package; single-swap validity does not imply package validity. */
export function evaluatePackage(
  context: CouncilContext,
  amendmentIds: string[],
): PackageCheck {
  const invalid = (reason: string): PackageCheck => ({
    amendmentIds,
    valid: false,
    reason,
  });
  if (new Set(amendmentIds).size !== amendmentIds.length)
    return invalid('Одна поправка указана несколько раз.');
  const amendments = amendmentIds.map((id) =>
    context.amendments.find((item) => item.id === id),
  );
  if (amendments.some((item) => !item)) return invalid('Неизвестная поправка.');
  const selected = amendments as Amendment[];
  const sources = selected.map((item) => item.replace.measureId);
  if (new Set(sources).size !== sources.length)
    return invalid('Одну меру нельзя заменить дважды.');
  const plan = context.plan.map(
    (item) =>
      selected.find((change) => change.replace.measureId === item.measureId)
        ?.with ?? item,
  );
  const violations = validatePlan(plan);
  if (violations.length > 0) {
    // The validator reports the authoritative total even when the package is invalid.
    return {
      amendmentIds,
      valid: false,
      plan,
      cost: inspectPlan(plan).cost,
      violations,
      reason: violations.map((item) => item.message).join(' '),
    };
  }
  const evaluation = applyPlan(plan);
  return {
    amendmentIds,
    valid: true,
    plan,
    evaluation,
    score: evaluation.score,
    cost: evaluation.cost,
  };
}
