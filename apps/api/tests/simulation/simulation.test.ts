import {
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { beforeAll, describe, expect, it } from 'vitest';
import { parsePlan } from '../../src/simulation/plan-parser';
import { roundPayload } from '../../src/simulation/round-payload';
import { SimulationController } from '../../src/simulation/simulation.controller';
import { SimulationService } from '../../src/simulation/simulation.service';
import { SCENARIO } from '../../src/simulation/engine/scenario';

const plan = SCENARIO.examples.strong;

describe('plan request parser', () => {
  it('returns a canonical plan without allowing additional fields into the engine', () => {
    expect(
      parsePlan({
        plan: [
          { measureId: 'M1', districtId: 'nura', score: 100 },
          { measureId: 'M2' },
        ],
        score: 100,
      }),
    ).toEqual([{ measureId: 'M1', districtId: 'nura' }, { measureId: 'M2' }]);
  });
  it.each([
    undefined,
    null,
    [],
    {},
    { plan: null },
    { plan: 'M1' },
    { plan: [null] },
    { plan: [[]] },
    { plan: [1] },
    { plan: [{}] },
    { plan: [{ measureId: 1 }] },
    { plan: [{ measureId: '' }] },
    { plan: [{ measureId: 'M1', districtId: null }] },
    { plan: [{ measureId: 'M1', districtId: 1 }] },
    { plan: [{ measureId: 'M1', districtId: '' }] },
  ])('returns 400 for malformed input %j', (body) =>
    expect(() => parsePlan(body)).toThrow(BadRequestException),
  );
  it('leaves unknown IDs to the domain validator', () =>
    expect(
      parsePlan({ plan: [{ measureId: 'unknown', districtId: 'missing' }] }),
    ).toEqual([{ measureId: 'unknown', districtId: 'missing' }]));
  it('accepts an empty plan so the builder can receive count violations', () =>
    expect(parsePlan({ plan: [] })).toEqual([]));
});

describe('simulation API', () => {
  let service: SimulationService;
  let controller: SimulationController;
  beforeAll(() => {
    service = new SimulationService();
    service.onModuleInit();
    service.onModuleInit();
    controller = new SimulationController(service);
  }, 30000);
  it('serves the shared scenario with 14 measures and baseline score', () => {
    const result = controller.scenario();
    expect(result.measures).toHaveLength(14);
    expect(result.baseline.score).toBe(52.56);
    expect(result.version).toBe('astana-v1');
  });
  it('validates partially assembled plans without disclosing a score', () => {
    expect(controller.validate({ plan: [] })).toMatchObject({
      cost: 0,
      remaining: 100,
      directionsUsed: 0,
      violations: [{ code: 'WRONG_COUNT' }],
    });
    const result = controller.validate({ plan });
    expect(result).toEqual({
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
    });
    expect(result).not.toHaveProperty('score');
  });
  it('rejects a domain-invalid plan with structured HTTP 422 violations', () => {
    try {
      controller.review({ plan: [] });
      throw new Error('should reject');
    } catch (error) {
      expect(error).toBeInstanceOf(UnprocessableEntityException);
      expect((error as UnprocessableEntityException).getStatus()).toBe(422);
      expect(
        (error as UnprocessableEntityException).getResponse(),
      ).toMatchObject({ violations: [{ code: 'WRONG_COUNT' }] });
    }
  });
  it('rounds review numbers only at the HTTP boundary', () => {
    const result = controller.review({ plan });
    expect(result.evaluation.score).toBe(56.54);
    expect(result.rank).toBe(566);
    expect(result.totalPlans).toBe(694395);
    expect(result.percentile).toBe(99.9);
    expect(result.efficiency).toBeCloseTo(85, 0);
    expect(result.optimum.score).toBe(57.24);
    expect(result.topSwaps[0].scoreAfter).toBe(57.21);
    expect(result.moves.map((move) => move.contribution)).toEqual([
      1.45, 1.4, 0.49, 0.47, 0.17,
    ]);
    expect(service.evaluate(plan).score).not.toBe(result.evaluation.score);
    expect(service.review(plan).evaluation.score).toBe(
      service.evaluate(plan).score,
    );
  });
  it('calculates improvement before rounding instead of subtracting displayed scores', () => {
    expect(service.review(plan).scoreDelta).toBeCloseTo(3.98539, 10);
    expect(controller.review({ plan }).scoreDelta).toBe(3.99);
  });
  it('calculates the optimum gap before rounding instead of subtracting displayed scores', () => {
    expect(service.review(plan).optimumGap).toBeCloseTo(0.693665, 10);
    expect(controller.review({ plan }).optimumGap).toBe(0.69);
  });
  it('does not trust scores sent by the client', () =>
    expect(controller.review({ plan, score: 100 }).evaluation.score).toBe(
      56.54,
    ));
});

describe('HTTP number formatting', () => {
  it('recurses through records and arrays while preserving other JSON primitives', () => {
    expect(
      roundPayload({
        score: 1.2345,
        items: [2.3456, null, true, 'hello'],
        missing: undefined,
      }),
    ).toEqual({
      score: 1.23,
      items: [2.35, null, true, 'hello'],
      missing: undefined,
    });
  });
});
