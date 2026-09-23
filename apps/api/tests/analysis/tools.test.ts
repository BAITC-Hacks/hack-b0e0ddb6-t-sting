import { describe, expect, it, vi } from 'vitest';
import { AnalystTools, TOOL_DEFINITIONS } from '../../src/analysis/tools';
import { fakeSimulation, plan } from './fixtures';

describe('analyst tools', () => {
  it('exposes only the five engine-backed tools with strict schemas', () => {
    expect(TOOL_DEFINITIONS.map((tool) => tool.name)).toEqual([
      'evaluate_plan',
      'explain_contributions',
      'get_rank',
      'find_best_swaps',
      'evaluate_alternative',
    ]);
    expect(
      TOOL_DEFINITIONS.every(
        (tool) => tool.input_schema.additionalProperties === false,
      ),
    ).toBe(true);
  });

  it('returns the evaluation with scenario names and scoring rules', () => {
    const { simulation } = fakeSimulation();
    const output = new AnalystTools(simulation).call('evaluate_plan', { plan });
    expect(output).toMatchObject({
      evaluation: { score: 56.54 },
      scenario: { horizon: 8 },
      scoring: { weakestDistrictWeight: 30, criticalThreshold: 40 },
    });
  });

  it('returns move contributions without rerunning the same full review', () => {
    const { simulation } = fakeSimulation();
    const tools = new AnalystTools(simulation);
    expect(tools.call('explain_contributions', { plan })).toMatchObject({
      moves: [{ contribution: 1.45 }, {}, {}, {}, {}],
    });
    expect(tools.call('get_rank', { plan })).toMatchObject({
      rank: 566,
      totalPlans: 694395,
      optimum: { score: 57.24 },
    });
    expect(simulation.review).toHaveBeenCalledTimes(1);
  });

  it('caps swap lists at the requested count and supports the default', () => {
    const { simulation, review } = fakeSimulation();
    review.topSwaps.push(review.topSwaps[0]);
    const tools = new AnalystTools(simulation);
    expect(tools.call('find_best_swaps', { plan, limit: 1 })).toEqual({
      swaps: [review.topSwaps[0]],
    });
    expect(tools.call('find_best_swaps', { plan })).toEqual({
      swaps: review.topSwaps,
    });
  });

  it('evaluates validated alternative plans independently', () => {
    const { simulation } = fakeSimulation();
    expect(
      new AnalystTools(simulation).call('evaluate_alternative', { plan }),
    ).toMatchObject({ evaluation: { cost: 96 } });
    expect(simulation.evaluate).toHaveBeenCalledWith(plan);
  });

  it.each([
    null,
    [],
    'plan',
    { plan, extra: true },
    { plan: [] },
    { plan: 'bad' },
    { plan: [{ measureId: 'M999' }] },
    { plan: [{ measureId: 'M1', districtId: 3 }] },
  ])('rejects malformed tool inputs: %j', (input) => {
    const { simulation } = fakeSimulation();
    expect(() =>
      new AnalystTools(simulation).call('get_rank', input),
    ).toThrow();
  });

  it.each([0, 6, 1.5, '2', null])('rejects invalid swap limit %j', (limit) => {
    const { simulation } = fakeSimulation();
    expect(() =>
      new AnalystTools(simulation).call('find_best_swaps', { plan, limit }),
    ).toThrow('limit');
  });

  it('rejects unknown tools and irrelevant limit parameters', () => {
    const { simulation } = fakeSimulation();
    const tools = new AnalystTools(simulation);
    expect(() => tools.call('run_sql', { plan })).toThrow('Unknown tool');
    expect(() => tools.call('get_rank', { plan, limit: 1 })).toThrow(
      'Unexpected',
    );
  });

  it('rejects unexpected fields within plan items', () => {
    const { simulation } = fakeSimulation();
    expect(() =>
      new AnalystTools(simulation).call('evaluate_plan', {
        plan: plan.map((item) => ({ ...item, instruction: 'extra' })),
      }),
    ).toThrow('Unexpected');
  });

  it('rejects engine rule violations before evaluating the plan', () => {
    const { simulation } = fakeSimulation();
    vi.mocked(simulation.validate).mockReturnValue({
      cost: 101,
      remaining: -1,
      directionsUsed: 4,
      directionCounts: {
        transport: 0,
        ecology: 1,
        social: 2,
        safety: 1,
        services: 1,
      },
      violations: [
        { code: 'BUDGET_EXCEEDED', message: 'Бюджет превышен', measureIds: [] },
      ],
    });
    expect(() =>
      new AnalystTools(simulation).call('evaluate_alternative', { plan }),
    ).toThrow('Бюджет превышен');
    expect(simulation.evaluate).not.toHaveBeenCalled();
  });
});
