import { SCENARIO } from '../simulation/engine/scenario';
import { applyPlan, evaluatePlan } from '../simulation/engine/scoring';
import type { CriticalCell, Plan } from '../simulation/engine/types';
import { allAmendments } from './amendments';
import { councilMetrics } from './metrics';
import { COUNCIL_MEMBERS, ROLE_IDS } from './roles';
import type { Brief, CouncilContext, CouncilRoleId, Stance } from './types';

function zoneIncludes(roleId: CouncilRoleId, cell: CriticalCell): boolean {
  if (roleId === 'ombudsman') return true;
  if (roleId === 'finance') return false;
  return (
    SCENARIO.indicators.find((indicator) => indicator.id === cell.indicatorId)!
      .direction === roleId
  );
}

function cellsInRange(
  context: CouncilContext,
  roleId: CouncilRoleId,
  min: number,
  max: number,
  inclusiveMax = false,
): CriticalCell[] {
  return context.evaluation.districts.flatMap((district) =>
    SCENARIO.indicators.flatMap((indicator) => {
      const value = district.after[indicator.id];
      const cell = {
        districtId: district.districtId,
        indicatorId: indicator.id,
        value,
      };
      return value >= min &&
        (value < max || (inclusiveMax && value === max)) &&
        zoneIncludes(roleId, cell)
        ? [cell]
        : [];
    }),
  );
}

function stanceFor(before: number, after: number): Stance {
  if (after - before > 0.01) return 'for';
  if (after - before < -0.1) return 'against';
  return 'conditional';
}

/** Build deterministic factual briefs for all seven fictional voting members. */
export function prepareCouncil(plan: Plan): CouncilContext {
  const evaluation = evaluatePlan(plan);
  const baseline = applyPlan([]);
  const context: CouncilContext = {
    plan: plan.map((item) => ({ ...item })),
    evaluation,
    baseline,
    members: COUNCIL_MEMBERS,
    briefs: [],
    amendments: [],
  };
  context.amendments = allAmendments(context.plan, baseline, evaluation);
  const original = councilMetrics(baseline, baseline);
  const current = councilMetrics(evaluation, baseline);
  context.briefs = ROLE_IDS.map((roleId): Brief => {
    const candidates = context.amendments
      .filter(
        (amendment) =>
          amendment.delta >= -1e-9 &&
          amendment.impacts.find((impact) => impact.roleId === roleId)!.delta >
            0.01,
      )
      .sort((a, b) => {
        const gain = (item: typeof a) =>
          item.impacts.find((impact) => impact.roleId === roleId)!.delta;
        return gain(b) - gain(a);
      })
      .slice(0, 3);
    const contributions = context.plan.flatMap((item, index) => {
      if (
        roleId !== 'ombudsman' &&
        roleId !== 'finance' &&
        SCENARIO.measures.find((measure) => measure.id === item.measureId)!
          .direction !== roleId
      )
        return [];
      const without = applyPlan(
        context.plan.filter((_, position) => position !== index),
      );
      return [
        {
          item,
          delta: current[roleId] - councilMetrics(without, baseline)[roleId],
        },
      ];
    });
    const criticalCells = cellsInRange(context, roleId, -Infinity, 40);
    const borderlineCells = cellsInRange(context, roleId, 40, 42, true);
    const deltas = [
      current[roleId] - original[roleId],
      ...contributions.map((item) => item.delta),
      ...candidates.flatMap((item) => [
        item.delta,
        ...item.impacts.map((impact) => impact.delta),
      ]),
    ];
    const roundedMagnitudes = deltas.flatMap((delta) => {
      const magnitude = Math.abs(delta);
      return [
        magnitude,
        Number(magnitude.toFixed(2)),
        Number(magnitude.toFixed(3)),
      ];
    });
    const numbers = [
      evaluation.score,
      evaluation.cost,
      evaluation.cityAverage,
      evaluation.weakestScore,
      baseline.score,
      original[roleId],
      current[roleId],
      ...criticalCells.map((cell) => cell.value),
      ...borderlineCells.map((cell) => cell.value),
      ...contributions.map((item) => item.delta),
      ...candidates.flatMap((item) => [
        item.scoreAfter,
        item.delta,
        item.cost,
        ...item.impacts.flatMap((impact) => [
          impact.before,
          impact.after,
          impact.delta,
        ]),
      ]),
      ...roundedMagnitudes,
      ...Array.from({ length: 14 }, (_, index) => index + 1),
    ];
    return {
      roleId,
      member: COUNCIL_MEMBERS.find((member) => member.id === roleId)!,
      metricBefore: original[roleId],
      metricAfter: current[roleId],
      stance: stanceFor(original[roleId], current[roleId]),
      criticalCells,
      borderlineCells,
      contributions,
      candidates,
      allowedNumbers: [...new Set(numbers.filter(Number.isFinite))],
    };
  });
  return context;
}
