import { SCENARIO } from './scenario';
import type { PlanItem } from './types';

export const PLAN_OPTIONS: PlanItem[][] = SCENARIO.measures.map((measure) =>
  measure.scope === 'city'
    ? [{ measureId: measure.id }]
    : SCENARIO.districts.map((district) => ({
        measureId: measure.id,
        districtId: district.id,
      })),
);
