import { describe, expect, it } from 'vitest';
import { SCENARIO } from '../../../src/simulation/engine/scenario';
import {
  applyPlan,
  evaluatePlan,
} from '../../../src/simulation/engine/scoring';
import { validatePlan } from '../../../src/simulation/engine/validation';
import type { Plan } from '../../../src/simulation/engine/types';

describe('Astana scoring', () => {
  it('keeps two critical cells and the exact district baselines without measures', () => {
    const baseline = applyPlan([]);
    expect(baseline.score).toBeCloseTo(52.55768, 5);
    [62.99, 57.06, 54.65, 56.63, 49.18].forEach((score, index) =>
      expect(baseline.districts[index].scoreAfter).toBeCloseTo(score, 10),
    );
    expect(baseline.criticalCells).toEqual([
      { districtId: 'nura', indicatorId: 'S1', value: 38 },
      { districtId: 'nura', indicatorId: 'S2', value: 35 },
    ]);
  });
  it('scores the dataset example with its fixed synergy and lagged effects', () => {
    const result = evaluatePlan(SCENARIO.examples.strong);
    expect(result.score).toBeCloseTo(56.54, 2);
    expect(result.cost).toBe(95);
    expect(result.criticalCells).toEqual([]);
    expect(result.synergies).toEqual([
      { measureIds: ['M10', 'M12'], districtId: 'nura' },
    ]);
    expect(result.districts[4].after).toMatchObject({
      S1: 48,
      S2: 43.75,
      B1: 67.5,
      B2: 51.75,
      C2: 54.375,
    });
  });
  it('penalizes the new critical transport cell in the trap plan', () => {
    const result = evaluatePlan(SCENARIO.examples.trap);
    expect(result.score).toBeCloseTo(52.45, 2);
    expect(result.cost).toBe(86);
    expect(result.criticalCells).toContainEqual({
      districtId: 'almaty',
      indicatorId: 'T1',
      value: 38.25,
    });
  });
  it('rejects invalid plans instead of calculating a score', () => {
    expect(() => evaluatePlan([])).toThrow();
  });
  it('clips oversaturated values after accumulating all effects', () => {
    const repeated = Array.from({ length: 60 }, () => ({
      measureId: 'M11',
      districtId: 'almaty',
    })) as Plan;
    expect(applyPlan(repeated).districts[1].after).toMatchObject({
      T1: 0,
      B2: 100,
    });
  });
  it('applies both other synergies in the district of their first measure', () => {
    const result = applyPlan([
      { measureId: 'M1', districtId: 'nura' },
      { measureId: 'M2' },
      { measureId: 'M5', districtId: 'saryarka' },
      { measureId: 'M6' },
    ]);
    expect(result.districts[4].after.T1).toBe(64.5);
    expect(result.districts[2].after.E2).toBe(52.25);
    expect(result.synergies).toHaveLength(2);
  });
  it('does not count a value of exactly 40 as critical', () => {
    expect(applyPlan([]).criticalCells.some((cell) => cell.value === 40)).toBe(
      false,
    );
  });
  it('scores the strongest five-direction reference plan', () => {
    const plan: Plan = [
      { measureId: 'M3', districtId: 'nura' },
      { measureId: 'M4', districtId: 'nura' },
      { measureId: 'M8', districtId: 'nura' },
      { measureId: 'M10', districtId: 'nura' },
      { measureId: 'M14' },
    ];
    expect(evaluatePlan(plan).score).toBeCloseTo(56.34451, 10);
  });
  it('is independent of plan ordering', () => {
    expect(evaluatePlan([...SCENARIO.examples.strong].reverse())).toEqual(
      evaluatePlan(SCENARIO.examples.strong),
    );
  });
});

describe('plan validation', () => {
  it('accepts the dataset example', () =>
    expect(validatePlan(SCENARIO.examples.strong)).toEqual([]));
  it.each([
    ['WRONG_COUNT', []],
    ['UNKNOWN_MEASURE', [{ measureId: 'M404' }]],
    ['UNKNOWN_DISTRICT', [{ measureId: 'M1', districtId: 'missing' }]],
    ['DISTRICT_REQUIRED', [{ measureId: 'M1' }]],
    ['DISTRICT_NOT_ALLOWED', [{ measureId: 'M2', districtId: 'nura' }]],
    ['DUPLICATE', [{ measureId: 'M2' }, { measureId: 'M2' }]],
    [
      'DIRECTION_LIMIT',
      [
        { measureId: 'M1', districtId: 'nura' },
        { measureId: 'M2' },
        { measureId: 'M3', districtId: 'almaty' },
      ],
    ],
    [
      'INCOMPATIBLE',
      [
        { measureId: 'M1', districtId: 'nura' },
        { measureId: 'M3', districtId: 'almaty' },
      ],
    ],
    [
      'INCOMPATIBLE',
      [
        { measureId: 'M4', districtId: 'nura' },
        { measureId: 'M7', districtId: 'nura' },
      ],
    ],
    [
      'INCOMPATIBLE',
      [
        { measureId: 'M5', districtId: 'nura' },
        { measureId: 'M13', districtId: 'nura' },
      ],
    ],
    [
      'BUDGET_EXCEEDED',
      [
        { measureId: 'M3', districtId: 'nura' },
        { measureId: 'M8', districtId: 'nura' },
        { measureId: 'M13', districtId: 'almaty' },
        { measureId: 'M12' },
        { measureId: 'M9', districtId: 'nura' },
      ],
    ],
  ])('reports %s clearly', (code, input) => {
    expect(validatePlan(input as Plan)).toContainEqual(
      expect.objectContaining({ code, message: expect.any(String) }),
    );
  });
  it('allows using all 100 budget units', () => {
    const plan = SCENARIO.examples.strong.map((item) =>
      item.measureId === 'M5' ? { measureId: 'M3', districtId: 'nura' } : item,
    ) as Plan;
    expect(validatePlan(plan)).toEqual([]);
    expect(evaluatePlan(plan).cost).toBe(100);
  });
  it('rejects the first unit over budget independently of all other rules', () => {
    const plan: Plan = [
      { measureId: 'M5', districtId: 'nura' },
      { measureId: 'M6' },
      { measureId: 'M7', districtId: 'nura' },
      { measureId: 'M8', districtId: 'nura' },
      { measureId: 'M10', districtId: 'nura' },
    ];
    expect(validatePlan(plan).map((violation) => violation.code)).toEqual([
      'BUDGET_EXCEEDED',
    ]);
  });
  it('allows district-local conflicts when the districts differ', () => {
    const violations = validatePlan([
      { measureId: 'M4', districtId: 'yesil' },
      { measureId: 'M7', districtId: 'nura' },
      { measureId: 'M10', districtId: 'nura' },
      { measureId: 'M12' },
      { measureId: 'M14' },
    ]);
    expect(violations).toEqual([]);
  });
});
