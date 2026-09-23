import { beforeAll, describe, expect, it } from 'vitest';
import { SCENARIO } from '../../../src/simulation/engine/scenario';
import { applyPlan, scorePlan } from '../../../src/simulation/engine/scoring';
import { contributions } from '../../../src/simulation/engine/contributions';
import {
  buildLandscape,
  rankOf,
  type Landscape,
} from '../../../src/simulation/engine/landscape';
import { findBestSwaps } from '../../../src/simulation/engine/swaps';
import { gradeMoves, gradeMove } from '../../../src/simulation/engine/moves';
import { validatePlan } from '../../../src/simulation/engine/validation';

const strong = SCENARIO.examples.strong;

describe('Shapley contributions', () => {
  it('attributes the complete improvement, including nonlinear penalties and synergies', () => {
    const values = contributions(strong);
    [1.45, 1.4, 0.49, 0.47, 0.17].forEach((value, index) =>
      expect(values[index]).toBeCloseTo(value, 2),
    );
    expect(values.reduce((sum, value) => sum + value, 0)).toBeCloseTo(
      scorePlan(strong) - scorePlan([]),
      12,
    );
  });
  it('handles an empty coalition', () => expect(contributions([])).toEqual([]));
  it('identifies the negative contribution in the trap', () =>
    expect(contributions(SCENARIO.examples.trap)[4]).toBeCloseTo(-0.87, 2));
});

describe('complete plan landscape', () => {
  let landscape: Landscape;
  beforeAll(() => {
    landscape = buildLandscape();
  }, 30000);
  it('enumerates every legal plan once', () => {
    expect(landscape.scores).toHaveLength(694395);
    expect(
      landscape.histogram.reduce((count, bin) => count + bin.count, 0),
    ).toBe(694395);
    expect(landscape.scores[0]).toBeCloseTo(52.04, 2);
    expect(
      Array.from(landscape.scores).filter((score) => score < scorePlan([])),
    ).toHaveLength(20003);
  });
  it('finds the independently known optimum', () => {
    expect(landscape.optimum.score).toBeCloseTo(57.24, 2);
    expect(landscape.optimum.plan).toEqual([
      { measureId: 'M2' },
      { measureId: 'M3', districtId: 'nura' },
      { measureId: 'M8', districtId: 'nura' },
      { measureId: 'M9', districtId: 'nura' },
      { measureId: 'M14' },
    ]);
    expect(validatePlan(landscape.optimum.plan)).toEqual([]);
  });
  it('gives the sample rank 566 and handles both bounds and ties', () => {
    expect(rankOf(landscape, scorePlan(strong))).toBe(566);
    expect(rankOf(landscape, landscape.optimum.score)).toBe(1);
    expect(rankOf(landscape, 100)).toBe(1);
    expect(rankOf(landscape, 0)).toBe(694396);
    expect(
      rankOf({ ...landscape, scores: new Float64Array([1, 2, 2, 3]) }, 2),
    ).toBe(2);
  });
});

describe('move review', () => {
  it('finds the best valid improvement of the strong plan', () => {
    const swaps = findBestSwaps(strong, 3);
    expect(swaps).toHaveLength(3);
    expect(swaps[0]).toMatchObject({
      replace: { measureId: 'M5', districtId: 'saryarka' },
      with: { measureId: 'M3', districtId: 'nura' },
    });
    expect(swaps[0].scoreAfter).toBeCloseTo(57.21, 2);
    expect(swaps[0].gain).toBeCloseTo(0.66, 2);
    for (const swap of swaps)
      expect(
        validatePlan(
          strong.map((item) =>
            item.measureId === swap.replace.measureId ? swap.with : item,
          ),
        ),
      ).toEqual([]);
  });
  it('respects an empty result limit', () =>
    expect(findBestSwaps(strong, 0)).toEqual([]));
  it('grades the example consistently with its critical rescues', () =>
    expect(gradeMoves(strong).map((move) => move.grade)).toEqual([
      'brilliant',
      'brilliant',
      'good',
      'good',
      'inaccuracy',
    ]));
  it('grades the harmful measure in the trap as a blunder', () =>
    expect(
      gradeMoves(SCENARIO.examples.trap).map((move) => move.grade),
    ).toEqual(['mistake', 'mistake', 'mistake', 'mistake', 'blunder']));
  it.each([
    [-0.01, 0, true, 'blunder'],
    [1, 1, false, 'mistake'],
    [1, 0.3, false, 'inaccuracy'],
    [1, 0.051, false, 'good'],
    [1, 0.05, false, 'best'],
    [1, 0, true, 'brilliant'],
  ])(
    'grades contribution %s and replacement gain %s at the documented boundary',
    (contribution, gain, special, grade) =>
      expect(
        gradeMove(contribution as number, gain as number, special as boolean),
      ).toBe(grade),
  );
  it('keeps detailed scoring and landscape scoring consistent', () =>
    expect(scorePlan(strong)).toBe(applyPlan(strong).score));
});
