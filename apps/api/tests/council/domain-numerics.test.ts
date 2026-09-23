import { describe, expect, it } from 'vitest';
import { prepareCouncil } from '../../src/council/briefs';
import { votesFor } from '../../src/council/votes';
import { SCENARIO } from '../../src/simulation/engine/scenario';
import type { Evaluation } from '../../src/simulation/engine/types';

const context = prepareCouncil(SCENARIO.examples.strong);

function withSaryarkaTransport(value: number): Evaluation {
  const evaluation = structuredClone(context.evaluation);
  evaluation.districts.find(
    (district) => district.districtId === 'saryarka',
  )!.after.T1 = value;
  return evaluation;
}

describe('documented council example', () => {
  it('matches the fixed reference score and all seven role metrics', () => {
    expect(context.baseline.score).toBeCloseTo(52.55768, 5);
    expect(context.evaluation.score).toBeCloseTo(56.54307, 5);
    const expected = [
      ['transport', 11.129],
      ['ecology', 11.3018],
      ['social', 12.5213],
      ['safety', 10.854],
      ['services', 12.2715],
      ['ombudsman', 52.9625],
      ['finance', 0.419514736842104],
    ] as const;
    for (const [roleId, value] of expected)
      expect(
        context.briefs.find((brief) => brief.roleId === roleId)!.metricAfter,
      ).toBeCloseTo(value, 10);
  });

  it('selects each role’s top candidate by its own gain', () => {
    const expected = [
      ['transport', 'swap:M5@saryarka>M3@yesil', 0.486],
      ['ecology', 'swap:M5@saryarka>M6@city', 0.1975],
      ['safety', 'swap:M5@saryarka>M2@city', 0.2025],
      ['services', 'swap:M10@nura>M14@city', 0.6125],
      ['ombudsman', 'swap:M5@saryarka>M3@nura', 2.02],
      ['finance', 'swap:M5@saryarka>M11@nura', 0.09709526315789424],
    ] as const;
    for (const [roleId, id, gain] of expected) {
      const amendment = context.briefs.find((brief) => brief.roleId === roleId)!
        .candidates[0];
      expect(amendment.id).toBe(id);
      expect(
        amendment.impacts.find((impact) => impact.roleId === roleId)!.delta,
      ).toBeCloseTo(gain, 10);
    }
    expect(
      context.briefs.find((brief) => brief.roleId === 'social')!.candidates,
    ).toEqual([]);
    expect(
      context.briefs
        .find((brief) => brief.roleId === 'ecology')!
        .contributions.map(({ item }) => item.measureId),
    ).toEqual(['M5']);
    expect(
      context.briefs
        .find((brief) => brief.roleId === 'services')!
        .contributions.map(({ item }) => item.measureId),
    ).toEqual(['M12']);
    const transport = context.briefs.find(
      (brief) => brief.roleId === 'transport',
    )!;
    expect(transport.allowedNumbers).toContain(0.133);
    expect(
      context.briefs.find((brief) => brief.roleId === 'finance')!
        .allowedNumbers,
    ).toContain(0.097);
  });

  it('uses raw values at the minus 0.1 vote boundary', () => {
    expect(
      votesFor(context, withSaryarkaTransport(45)).find(
        (vote) => vote.roleId === 'transport',
      )!.vote,
    ).toBe('against');
    expect(
      votesFor(context, withSaryarkaTransport(45.05)).find(
        (vote) => vote.roleId === 'transport',
      )!.vote,
    ).toBe('abstain');
    expect(
      votesFor(context, withSaryarkaTransport(50 - 1e-11)).find(
        (vote) => vote.roleId === 'transport',
      )!.vote,
    ).toBe('for');
  });

  it('treats 40 as noncritical, but a new 39.999 cell as a veto', () => {
    const atForty = structuredClone(context.evaluation);
    const belowForty = structuredClone(context.evaluation);
    belowForty.districts.find(
      (district) => district.districtId === 'almaty',
    )!.after.T1 = 39.999;
    belowForty.criticalCells.push({
      districtId: 'almaty',
      indicatorId: 'T1',
      value: 39.999,
    });
    expect(
      votesFor(context, atForty).find((vote) => vote.roleId === 'transport')!
        .vote,
    ).toBe('for');
    expect(
      votesFor(context, belowForty).find((vote) => vote.roleId === 'transport')!
        .vote,
    ).toBe('against');
  });

  it('does not treat a persistent critical cell as newly created', () => {
    const trap = prepareCouncil(SCENARIO.examples.trap);
    expect(trap.evaluation.criticalCells.length).toBeGreaterThan(0);
    expect(
      votesFor(trap, trap.evaluation).every((vote) => vote.vote === 'for'),
    ).toBe(true);
  });

  it('records the services candidate using engine output, including the specification discrepancy', () => {
    const services = context.briefs.find(
      (brief) => brief.roleId === 'services',
    )!.candidates[0];
    expect(services.scoreAfter).toBeCloseTo(56.62718, 5);
    expect(services.delta).toBeCloseTo(0.08411, 5);
    expect(services.cost).toBe(99);
  });
});
