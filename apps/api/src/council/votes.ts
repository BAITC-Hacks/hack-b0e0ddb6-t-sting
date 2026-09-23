import { SCENARIO } from '../simulation/engine/scenario';
import type { Evaluation } from '../simulation/engine/types';
import { metricImpacts } from './metrics';
import type { CouncilContext, CouncilRoleId, Vote } from './types';

function newCriticalInZone(
  roleId: CouncilRoleId,
  before: Evaluation,
  after: Evaluation,
): boolean {
  if (roleId === 'finance') return false;
  return after.criticalCells.some((cell) => {
    if (
      roleId !== 'ombudsman' &&
      SCENARIO.indicators.find(
        (indicator) => indicator.id === cell.indicatorId,
      )!.direction !== roleId
    )
      return false;
    const previous = before.districts.find(
      (district) => district.districtId === cell.districtId,
    )!.after[cell.indicatorId];
    return previous >= 40;
  });
}

/** Boundary rules are applied to raw metric deltas, never rounded display values. */
export function votesFor(
  context: CouncilContext,
  evaluation: Evaluation,
): Vote[] {
  return metricImpacts(context.evaluation, evaluation, context.baseline).map(
    ({ roleId, delta }) => ({
      roleId,
      delta,
      vote:
        newCriticalInZone(roleId, context.evaluation, evaluation) ||
        delta <= -0.1 + 1e-10
          ? 'against'
          : delta < -1e-10
            ? 'abstain'
            : 'for',
    }),
  );
}
