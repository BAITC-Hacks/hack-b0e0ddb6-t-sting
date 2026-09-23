import type {
  Analysis,
  Evaluation,
  Review,
  Scenario,
  Submission,
  Validation,
} from '../../src/api/contracts';
import { SCENARIO } from './data';
export const baseline: Evaluation = {
  score: 52.56,
  cityAverage: 57.63,
  weakestScore: 48.94,
  cost: 0,
  criticalCells: [
    { districtId: 'nura', indicatorId: 'S1', value: 38 },
    { districtId: 'nura', indicatorId: 'S2', value: 35 },
  ],
  districts: SCENARIO.districts.map((district, index) => ({
    districtId: district.id,
    before: { ...district.indicators },
    after: { ...district.indicators },
    scoreBefore: [62.6, 56.88, 55.26, 56.86, 49.96][index],
    scoreAfter: [62.6, 56.88, 55.26, 56.86, 49.96][index],
  })),
  synergies: [],
};
export const scenario: Scenario = { ...SCENARIO, baseline };
export const valid: Validation = {
  cost: 95,
  remaining: 5,
  directionsUsed: 4,
  directionCounts: {
    transport: 0,
    ecology: 1,
    social: 2,
    safety: 1,
    services: 1,
  },
  violations: [],
};
export const emptyValidation: Validation = {
  cost: 0,
  remaining: 100,
  directionsUsed: 0,
  directionCounts: {
    transport: 0,
    ecology: 0,
    social: 0,
    safety: 0,
    services: 0,
  },
  violations: [
    { code: 'WRONG_COUNT', message: 'Выберите ровно 5 мер.', measureIds: [] },
  ],
};
export const review: Review = {
  evaluation: {
    ...baseline,
    score: 56.54,
    cityAverage: 59.74,
    weakestScore: 55.76,
    cost: 95,
    criticalCells: [],
    districts: baseline.districts.map((entry) =>
      entry.districtId === 'nura'
        ? {
            ...entry,
            after: { ...entry.after, S1: 48, S2: 43.75 },
            scoreAfter: 55.76,
          }
        : entry,
    ),
    synergies: [{ measureIds: ['M10', 'M12'], districtId: 'nura' }],
  },
  baselineScore: 52.56,
  scoreDelta: 3.99,
  optimumGap: 0.69,
  rank: 566,
  totalPlans: 694395,
  percentile: 99.92,
  efficiency: 85,
  optimum: { score: 57.23, plan: scenario.examples.strong },
  moves: [
    {
      item: scenario.examples.strong[0],
      contribution: 1.98,
      grade: 'brilliant',
    },
    { item: scenario.examples.strong[1], contribution: 1.26, grade: 'best' },
    { item: scenario.examples.strong[2], contribution: 0.44, grade: 'good' },
    {
      item: scenario.examples.strong[3],
      contribution: 0.38,
      grade: 'inaccuracy',
    },
    {
      item: scenario.examples.strong[4],
      contribution: -0.08,
      grade: 'blunder',
    },
  ],
  topSwaps: [
    {
      replace: { measureId: 'M5', districtId: 'saryarka' },
      with: { measureId: 'M3', districtId: 'nura' },
      scoreAfter: 57.21,
      gain: 0.67,
    },
  ],
  histogram: [
    { from: 49, to: 52, count: 10 },
    { from: 52, to: 55, count: 200 },
    { from: 55, to: 58, count: 15 },
  ],
};
export const analysis: Analysis = {
  source: 'offline',
  summary: 'План улучшает доступность школ и поликлиник в Нуре.',
  strengths: ['Сняты два критических значения.'],
  risks: ['Долгий лаг откладывает эффект.'],
  consequences: ['Разрыв между районами сокращается.'],
  recommendations: ['Проверьте замену M5 на M3 в Нуре.'],
  trace: [{ tool: 'evaluate_plan', input: { plan: scenario.examples.strong } }],
};
export const submission: Submission = {
  id: 'entry-1',
  teamName: 'Астана',
  plan: scenario.examples.strong,
  score: 56.54,
  rank: 566,
  createdAt: '2026-09-23T10:00:00Z',
};
