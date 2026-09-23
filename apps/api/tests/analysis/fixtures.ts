import type {
  Indicators,
  Plan,
  Review,
  Scenario,
} from '../../src/simulation/engine/types';
import type { AnalysisSimulation } from '../../src/analysis/contracts';
import { inspectPlan } from '../../src/simulation/engine/validation';
import { vi } from 'vitest';

const indicators: Indicators = {
  T1: 50,
  T2: 50,
  E1: 50,
  E2: 50,
  S1: 38,
  S2: 35,
  B1: 50,
  B2: 50,
  C1: 50,
  C2: 50,
};
export const plan: Plan = [
  { measureId: 'M7', districtId: 'nura' },
  { measureId: 'M8', districtId: 'nura' },
  { measureId: 'M10', districtId: 'nura' },
  { measureId: 'M12' },
  { measureId: 'M5', districtId: 'saryarka' },
];
export function fixture() {
  const review: Review = {
    evaluation: {
      score: 56.54,
      cityAverage: 58,
      weakestScore: 53.13,
      cost: 96,
      criticalCells: [],
      synergies: [{ measureIds: ['M10', 'M12'], districtId: 'nura' }],
      districts: [
        {
          districtId: 'nura',
          before: indicators,
          after: { ...indicators, S1: 48, S2: 45 },
          scoreBefore: 42,
          scoreAfter: 53.13,
        },
        {
          districtId: 'saryarka',
          before: { ...indicators, S1: 50, S2: 50 },
          after: { ...indicators, S1: 50, S2: 50 },
          scoreBefore: 55,
          scoreAfter: 57,
        },
      ],
    },
    baselineScore: 52.56,
    scoreDelta: 3.98,
    optimumGap: 0.7,
    rank: 566,
    totalPlans: 694395,
    percentile: 99.9,
    efficiency: 85,
    optimum: { score: 57.24, plan },
    moves: [
      { item: plan[0], contribution: 1.45, grade: 'brilliant' },
      { item: plan[1], contribution: 1.4, grade: 'brilliant' },
      { item: plan[2], contribution: 0.49, grade: 'good' },
      { item: plan[3], contribution: 0.47, grade: 'good' },
      { item: plan[4], contribution: 0.17, grade: 'inaccuracy' },
    ],
    topSwaps: [
      {
        replace: plan[4],
        with: { measureId: 'M3', districtId: 'nura' },
        scoreAfter: 57.21,
        gain: 0.66,
      },
    ],
    histogram: [{ from: 52, to: 58, count: 694395 }],
  };
  const scenario: Scenario = {
    version: 'test-v1',
    budget: 100,
    horizon: 8,
    rules: [],
    incompatibilities: [],
    synergies: [],
    examples: { strong: plan, trap: plan },
    baseline: { ...review.evaluation, score: 52.56 },
    districts: [
      {
        id: 'nura',
        name: 'Нура',
        population: 0.5,
        profile: 'Новый район',
        indicators,
      },
      {
        id: 'saryarka',
        name: 'Сарыарка',
        population: 0.5,
        profile: 'Жилой район',
        indicators,
      },
    ],
    indicators: [
      { id: 'S1', name: 'Образование', direction: 'social', weight: 0.1 },
      { id: 'S2', name: 'Здоровье', direction: 'social', weight: 0.1 },
    ],
    measures: [
      {
        id: 'M7',
        name: 'Школа',
        direction: 'social',
        scope: 'district',
        cost: 24,
        lag: 4,
        effects: { S1: 20 },
      },
      {
        id: 'M8',
        name: 'Поликлиника',
        direction: 'social',
        scope: 'district',
        cost: 24,
        lag: 4,
        effects: { S2: 20 },
      },
      {
        id: 'M10',
        name: 'Спорт',
        direction: 'safety',
        scope: 'district',
        cost: 16,
        lag: 2,
        effects: { B2: 10 },
      },
      {
        id: 'M12',
        name: 'Сервисы',
        direction: 'services',
        scope: 'city',
        cost: 18,
        lag: 1,
        effects: { C1: 10 },
      },
      {
        id: 'M5',
        name: 'Парк',
        direction: 'ecology',
        scope: 'district',
        cost: 14,
        lag: 2,
        effects: { E1: 10 },
      },
      {
        id: 'M3',
        name: 'ЛРТ',
        direction: 'transport',
        scope: 'district',
        cost: 25,
        lag: 4,
        effects: { T1: 20 },
      },
    ],
  };
  return { review, scenario };
}

export const finalReport = {
  summary: 'План улучшает качество жизни.',
  strengths: ['Главный вклад даёт школа.'],
  risks: ['Результат ограничен лагом.'],
  consequences: ['Нура улучшится сильнее.'],
  recommendations: ['Рассмотрите ЛРТ в Нуре.'],
};

export function fakeSimulation() {
  const { review, scenario } = fixture();
  const simulation: AnalysisSimulation = {
    scenario: () => scenario,
    review: vi.fn(() => review),
    evaluate: vi.fn(() => review.evaluation),
    validate: vi.fn(inspectPlan),
  };
  return { simulation, review, scenario };
}
