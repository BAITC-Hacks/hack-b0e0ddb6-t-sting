import type { Schema } from './schema';
export type {
  Analysis,
  DistrictId,
  DirectionId,
  Evaluation,
  IndicatorId,
  Measure,
  Plan,
  PlanItem,
  Review,
  Scenario,
  Submission,
  Swap,
  Validation,
} from '../../../api/src/simulation/engine/types';
const text = 'string';
const number = 'number';
const district = {
  values: ['yesil', 'almaty', 'saryarka', 'baikonur', 'nura'],
};
const direction = {
  values: ['transport', 'ecology', 'social', 'safety', 'services'],
};
const measure = {
  values: Array.from({ length: 14 }, (_, index) => `M${index + 1}`),
};
const indicatorIds = [
  'T1',
  'T2',
  'E1',
  'E2',
  'S1',
  'S2',
  'B1',
  'B2',
  'C1',
  'C2',
];
const indicator = { values: indicatorIds };
const indicators: Schema = {
  fields: Object.fromEntries(indicatorIds.map((id) => [id, number])),
};
const effects: Schema = {
  fields: Object.fromEntries(
    indicatorIds.map((id) => [id, { optional: number }]),
  ),
};
const item: Schema = {
  fields: { measureId: measure, districtId: { optional: district } },
};
const plan: Schema = { array: item };
const pair: Schema = { array: measure, min: 2 };
const swap: Schema = {
  fields: { replace: item, with: item, scoreAfter: number, gain: number },
};
const strings: Schema = { array: text };
const evaluation: Schema = {
  fields: {
    score: number,
    cityAverage: number,
    weakestScore: number,
    cost: number,
    criticalCells: {
      array: {
        fields: { districtId: district, indicatorId: indicator, value: number },
      },
    },
    districts: {
      array: {
        fields: {
          districtId: district,
          before: indicators,
          after: indicators,
          scoreBefore: number,
          scoreAfter: number,
        },
      },
      min: 1,
    },
    synergies: {
      array: { fields: { measureIds: pair, districtId: district } },
    },
  },
};
export const scenarioSchema: Schema = {
  fields: {
    version: text,
    budget: number,
    horizon: number,
    districts: {
      array: {
        fields: {
          id: district,
          name: text,
          population: number,
          indicators,
          profile: text,
        },
      },
      min: 1,
    },
    indicators: {
      array: {
        fields: { id: indicator, name: text, direction, weight: number },
      },
      min: 1,
    },
    measures: {
      array: {
        fields: {
          id: measure,
          name: text,
          direction,
          scope: { values: ['district', 'city'] },
          cost: number,
          lag: number,
          effects,
        },
      },
      min: 1,
    },
    synergies: { array: { fields: { measureIds: pair, effects } } },
    incompatibilities: {
      array: {
        fields: { measureIds: pair, sameDistrictOnly: 'boolean', reason: text },
      },
    },
    rules: strings,
    examples: { fields: { strong: plan, trap: plan } },
    baseline: evaluation,
  },
};
export const validationSchema: Schema = {
  fields: {
    cost: number,
    remaining: number,
    directionsUsed: number,
    directionCounts: {
      fields: Object.fromEntries(direction.values.map((id) => [id, number])),
    },
    violations: {
      array: {
        fields: {
          code: {
            values: [
              'UNKNOWN_MEASURE',
              'UNKNOWN_DISTRICT',
              'WRONG_COUNT',
              'DUPLICATE',
              'DISTRICT_REQUIRED',
              'DISTRICT_NOT_ALLOWED',
              'BUDGET_EXCEEDED',
              'DIRECTION_LIMIT',
              'INCOMPATIBLE',
            ],
          },
          message: text,
          measureIds: { array: measure },
        },
      },
    },
  },
};
export const reviewSchema: Schema = {
  fields: {
    evaluation,
    baselineScore: number,
    scoreDelta: number,
    optimumGap: number,
    rank: number,
    totalPlans: number,
    percentile: number,
    efficiency: number,
    optimum: { fields: { score: number, plan } },
    moves: {
      array: {
        fields: {
          item,
          contribution: number,
          grade: {
            values: [
              'brilliant',
              'best',
              'good',
              'inaccuracy',
              'mistake',
              'blunder',
            ],
          },
          bestSwap: { optional: swap },
        },
      },
    },
    topSwaps: { array: swap },
    histogram: {
      array: { fields: { from: number, to: number, count: number } },
      min: 1,
    },
  },
};
export const analysisSchema: Schema = {
  fields: {
    source: { values: ['llm', 'offline'] },
    summary: text,
    strengths: strings,
    risks: strings,
    consequences: strings,
    recommendations: strings,
    trace: { array: { fields: { tool: text, input: 'unknown' } } },
  },
};
export const submissionSchema: Schema = {
  fields: {
    id: text,
    teamName: text,
    plan,
    score: number,
    rank: number,
    createdAt: text,
  },
};
