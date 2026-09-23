import { contributions } from './contributions';
import { applyPlan } from './scoring';
import { findBestSwaps } from './swaps';
import type { MoveGrade, MoveReview, Plan, Swap } from './types';

export const MOVE_THRESHOLDS = { mistake: 1, inaccuracy: 0.3, good: 0.05 };

export function gradeMove(
  contribution: number,
  replacementGain: number,
  special: boolean,
): MoveGrade {
  if (contribution < 0) return 'blunder';
  if (replacementGain >= MOVE_THRESHOLDS.mistake) return 'mistake';
  if (replacementGain >= MOVE_THRESHOLDS.inaccuracy) return 'inaccuracy';
  if (replacementGain > MOVE_THRESHOLDS.good) return 'good';
  return special ? 'brilliant' : 'best';
}

export function gradeMoves(
  plan: Plan,
  swaps: Swap[] = findBestSwaps(plan),
): MoveReview[] {
  const values = contributions(plan);
  const evaluation = applyPlan(plan);
  return plan.map((item, index) => {
    const bestSwap = swaps.find(
      (swap) => swap.replace.measureId === item.measureId,
    );
    const without = applyPlan(plan.filter((_, other) => other !== index));
    const rescuesCritical = without.criticalCells.some(
      (cell) =>
        !evaluation.criticalCells.some(
          (after) =>
            after.districtId === cell.districtId &&
            after.indicatorId === cell.indicatorId,
        ),
    );
    const enablesSynergy = evaluation.synergies.some((synergy) =>
      synergy.measureIds.includes(item.measureId),
    );
    const grade = gradeMove(
      values[index],
      bestSwap?.gain ?? 0,
      rescuesCritical || enablesSynergy,
    );
    return {
      item,
      contribution: values[index],
      grade,
      ...(bestSwap ? { bestSwap } : {}),
    };
  });
}
