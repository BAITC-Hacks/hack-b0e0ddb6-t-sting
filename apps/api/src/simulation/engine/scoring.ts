import { SCENARIO } from './scenario';
import { MEASURE_BY_ID, validatePlan } from './validation';
import type { Evaluation, IndicatorId, Indicators, Plan } from './types';

const indicatorIds = SCENARIO.indicators.map((indicator) => indicator.id);
const weights = SCENARIO.indicators.map((indicator) => indicator.weight);
const initial = SCENARIO.districts.flatMap((district) =>
  indicatorIds.map((id) => district.indicators[id]),
);
const districtIndex = new Map(
  SCENARIO.districts.map((district, index) => [district.id, index]),
);
const effects = new Map(
  SCENARIO.measures.map((measure) => [
    measure.id,
    Object.entries(measure.effects).map(([id, effect]) => [
      indicatorIds.indexOf(id as IndicatorId),
      (effect * (SCENARIO.horizon - measure.lag)) / SCENARIO.horizon,
    ]),
  ]),
);

function addEffects(values: number[], district: number, changes: number[][]) {
  for (const [indicator, effect] of changes)
    values[district * 10 + indicator] += effect;
}

/** Accepts valid measure IDs and locations; subsets are intentional for Shapley. */
function applyEffects(plan: Plan) {
  const values = [...initial];
  const synergies: Evaluation['synergies'] = [];
  for (const item of plan) {
    const changes = effects.get(item.measureId)!;
    if (item.districtId !== undefined)
      addEffects(values, districtIndex.get(item.districtId)!, changes);
    else
      for (let district = 0; district < SCENARIO.districts.length; district++)
        addEffects(values, district, changes);
  }
  for (const synergy of SCENARIO.synergies) {
    const first = plan.find((item) => item.measureId === synergy.measureIds[0]);
    if (
      first &&
      plan.some((item) => item.measureId === synergy.measureIds[1])
    ) {
      const districtId = first.districtId!;
      const district = districtIndex.get(districtId)!;
      for (const [id, effect] of Object.entries(synergy.effects))
        values[district * 10 + indicatorIds.indexOf(id as IndicatorId)] +=
          effect;
      synergies.push({ measureIds: synergy.measureIds, districtId });
    }
  }
  for (let i = 0; i < values.length; i++)
    values[i] = Math.max(0, Math.min(100, values[i]));
  return { values, synergies };
}

function summarize(values: number[]) {
  const districtScores: number[] = [];
  let criticalCount = 0;
  let cityAverage = 0;
  for (let district = 0; district < SCENARIO.districts.length; district++) {
    let score = 0;
    for (let indicator = 0; indicator < indicatorIds.length; indicator++) {
      const value = values[district * 10 + indicator];
      score += value * weights[indicator];
      if (value < 40) criticalCount++;
    }
    districtScores.push(score);
    cityAverage += score * SCENARIO.districts[district].population;
  }
  const weakestScore = Math.min(...districtScores);
  return {
    districtScores,
    cityAverage,
    weakestScore,
    score: 0.7 * cityAverage + 0.3 * weakestScore - criticalCount,
  };
}

/** Shares the exact arithmetic with the detailed evaluator during enumeration. */
export function scorePlan(plan: Plan): number {
  return summarize(applyEffects(plan).values).score;
}

export function applyPlan(plan: Plan): Evaluation {
  const { values, synergies } = applyEffects(plan);
  const { districtScores, cityAverage, weakestScore, score } =
    summarize(values);
  const criticalCells: Evaluation['criticalCells'] = [];
  const districts = SCENARIO.districts.map((district, index) => {
    const after = {} as Indicators;
    let scoreBefore = 0;
    for (const [indicator, id] of indicatorIds.entries()) {
      after[id] = values[index * 10 + indicator];
      scoreBefore += district.indicators[id] * weights[indicator];
      if (after[id] < 40)
        criticalCells.push({
          districtId: district.id,
          indicatorId: id,
          value: after[id],
        });
    }
    return {
      districtId: district.id,
      before: { ...district.indicators },
      after,
      scoreBefore,
      scoreAfter: districtScores[index],
    };
  });
  return {
    score,
    cityAverage,
    weakestScore,
    cost: plan.reduce(
      (sum, item) => sum + MEASURE_BY_ID.get(item.measureId)!.cost,
      0,
    ),
    criticalCells,
    districts,
    synergies,
  };
}

export function evaluatePlan(plan: Plan): Evaluation {
  if (validatePlan(plan).length > 0)
    throw new Error('Невалидный план: Score не рассчитывается.');
  return applyPlan(plan);
}
