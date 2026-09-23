import { SCENARIO } from './scenario';
import type {
  DirectionId,
  MeasureId,
  Plan,
  RuleCode,
  RuleViolation,
  Validation,
} from './types';

export const MEASURE_BY_ID = new Map(
  SCENARIO.measures.map((measure) => [measure.id, measure]),
);

/** Also used while building a plan, so incomplete selections return useful totals. */
export function inspectPlan(plan: Plan): Validation {
  const violations: RuleViolation[] = [];
  const add = (code: RuleCode, message: string, measureIds: MeasureId[]) =>
    violations.push({ code, message, measureIds });
  const directionCounts: Record<DirectionId, number> = {
    transport: 0,
    ecology: 0,
    social: 0,
    safety: 0,
    services: 0,
  };
  const seen = new Set<MeasureId>();
  let cost = 0;
  if (plan.length !== 5) add('WRONG_COUNT', 'Выберите ровно 5 мер.', []);
  for (const item of plan) {
    const measure = MEASURE_BY_ID.get(item.measureId);
    if (!measure) {
      add('UNKNOWN_MEASURE', 'Неизвестная мера.', [item.measureId]);
      continue;
    }
    cost += measure.cost;
    directionCounts[measure.direction]++;
    if (seen.has(item.measureId))
      add('DUPLICATE', 'Каждую меру можно выбрать только один раз.', [
        item.measureId,
      ]);
    seen.add(item.measureId);
    if (
      item.districtId !== undefined &&
      !SCENARIO.districts.some((district) => district.id === item.districtId)
    )
      add('UNKNOWN_DISTRICT', 'Неизвестный район.', [item.measureId]);
    if (measure.scope === 'district' && item.districtId === undefined)
      add('DISTRICT_REQUIRED', 'Для районной меры выберите район.', [
        item.measureId,
      ]);
    if (measure.scope === 'city' && item.districtId !== undefined)
      add('DISTRICT_NOT_ALLOWED', 'Для городской меры район не указывается.', [
        item.measureId,
      ]);
  }
  if (cost > SCENARIO.budget)
    add(
      'BUDGET_EXCEEDED',
      'Стоимость плана превышает бюджет 100.',
      plan.map((item) => item.measureId),
    );
  for (const [direction, count] of Object.entries(directionCounts)) {
    if (count > 2)
      add(
        'DIRECTION_LIMIT',
        'Можно выбрать не более 2 мер одного направления.',
        plan
          .filter(
            (item) =>
              MEASURE_BY_ID.get(item.measureId)?.direction === direction,
          )
          .map((item) => item.measureId),
      );
  }
  for (const conflict of SCENARIO.incompatibilities) {
    const first = plan.find(
      (item) => item.measureId === conflict.measureIds[0],
    );
    const second = plan.find(
      (item) => item.measureId === conflict.measureIds[1],
    );
    if (
      first &&
      second &&
      (!conflict.sameDistrictOnly || first.districtId === second.districtId)
    )
      add('INCOMPATIBLE', conflict.reason, conflict.measureIds);
  }
  return {
    cost,
    remaining: SCENARIO.budget - cost,
    directionsUsed: Object.values(directionCounts).filter((count) => count > 0)
      .length,
    directionCounts,
    violations,
  };
}

export function validatePlan(plan: Plan): RuleViolation[] {
  return inspectPlan(plan).violations;
}
