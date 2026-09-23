import { describe, expect, it } from 'vitest';
import { SCENARIO } from '../../src/simulation/engine/scenario';
import { applyPlan } from '../../src/simulation/engine/scoring';
import { validatePlan } from '../../src/simulation/engine/validation';
import { councilMetrics } from '../../src/council/metrics';
import { prepareCouncil } from '../../src/council/briefs';
import { evaluatePackage } from '../../src/council/amendments';
import { votesFor } from '../../src/council/votes';

const strong = SCENARIO.examples.strong;

describe('council domain', () => {
  it('attributes the exact city average to the five departments', () => {
    const evaluation = applyPlan(strong);
    const metrics = councilMetrics(evaluation, applyPlan([]));
    expect(
      metrics.transport +
        metrics.ecology +
        metrics.social +
        metrics.safety +
        metrics.services,
    ).toBeCloseTo(evaluation.cityAverage, 12);
    expect(metrics.ombudsman).toBeCloseTo(
      evaluation.weakestScore - evaluation.criticalCells.length,
      12,
    );
    expect(metrics.finance).toBeCloseTo(
      ((evaluation.score - applyPlan([]).score) / evaluation.cost) * 10,
      12,
    );
    expect(councilMetrics(applyPlan([]), applyPlan([])).finance).toBe(0);
  });

  it('finds valid top candidates and includes the documented LRT tradeoff', () => {
    const context = prepareCouncil(strong);
    expect(context.members).toHaveLength(8);
    expect(context.briefs).toHaveLength(7);
    const transport = context.briefs.find(
      (brief) => brief.roleId === 'transport',
    )!;
    expect(transport.candidates).toHaveLength(3);
    expect(
      transport.candidates[0].impacts.find(
        (impact) => impact.roleId === 'transport',
      )!.delta,
    ).toBeGreaterThan(0);
    for (const brief of context.briefs) {
      expect(brief.candidates.length).toBeLessThanOrEqual(3);
      for (const candidate of brief.candidates) {
        expect(
          candidate.impacts.find((impact) => impact.roleId === brief.roleId)!
            .delta,
        ).toBeGreaterThan(0.01);
        expect(candidate.delta).toBeGreaterThanOrEqual(-1e-9);
        expect(validatePlan(candidate.plan)).toEqual([]);
      }
    }
    const lrt = context.amendments.find(
      (amendment) =>
        amendment.replace.measureId === 'M5' &&
        amendment.with.measureId === 'M3' &&
        amendment.with.districtId === 'nura',
    )!;
    expect(lrt.scoreAfter).toBeCloseTo(57.21, 2);
    expect(lrt.cost).toBe(100);
    expect(
      lrt.impacts.find((impact) => impact.roleId === 'ecology')!.delta,
    ).toBeCloseTo(-0.16, 2);
    expect(
      context.briefs.find((brief) => brief.roleId === 'social')!.candidates,
    ).toEqual([]);
    expect(
      context.briefs.find((brief) => brief.roleId === 'ecology')!
        .borderlineCells,
    ).toContainEqual({ districtId: 'saryarka', indicatorId: 'E1', value: 42 });
    expect(
      context.briefs.find((brief) => brief.roleId === 'ombudsman')!
        .borderlineCells,
    ).toContainEqual({ districtId: 'almaty', indicatorId: 'T1', value: 40 });
    expect(
      context.briefs.find((brief) => brief.roleId === 'finance')!.criticalCells,
    ).toEqual([]);
    expect(transport.allowedNumbers).toContain(3);
  });

  it('rejects duplicate, unknown, conflicting, and over-budget packages', () => {
    const context = prepareCouncil(strong);
    const lrt = context.amendments.find(
      (item) =>
        item.replace.measureId === 'M5' &&
        item.with.measureId === 'M3' &&
        item.with.districtId === 'nura',
    )!;
    const services = context.amendments.find(
      (item) =>
        item.replace.measureId === 'M10' && item.with.measureId === 'M14',
    )!;
    expect(evaluatePackage(context, [lrt.id]).score).toBeCloseTo(57.21, 2);
    expect(evaluatePackage(context, [lrt.id, services.id])).toMatchObject({
      valid: false,
      cost: 104,
    });
    expect(evaluatePackage(context, [lrt.id, lrt.id])).toMatchObject({
      valid: false,
    });
    expect(evaluatePackage(context, ['missing'])).toMatchObject({
      valid: false,
    });
    const anotherM5 = context.amendments.find(
      (item) => item.replace.measureId === 'M5' && item.id !== lrt.id,
    )!;
    expect(evaluatePackage(context, [lrt.id, anotherM5.id])).toMatchObject({
      valid: false,
    });
    expect(evaluatePackage(context, [])).toMatchObject({
      valid: true,
      score: context.evaluation.score,
    });
  });

  it('votes five for, one abstain, one against on the LRT in Nura', () => {
    const context = prepareCouncil(strong);
    const lrt = context.amendments.find(
      (item) =>
        item.replace.measureId === 'M5' &&
        item.with.measureId === 'M3' &&
        item.with.districtId === 'nura',
    )!;
    const votes = votesFor(context, applyPlan(lrt.plan));
    expect(votes.map(({ roleId, vote }) => [roleId, vote])).toEqual([
      ['transport', 'for'],
      ['ecology', 'against'],
      ['social', 'for'],
      ['safety', 'for'],
      ['services', 'abstain'],
      ['ombudsman', 'for'],
      ['finance', 'for'],
    ]);
  });

  it('vetoes a new critical cell in a member’s zone even when the metric improves', () => {
    const context = prepareCouncil(strong);
    const changed = structuredClone(context.evaluation);
    const yesil = changed.districts.find(
      (district) => district.districtId === 'yesil',
    )!;
    yesil.after.T1 = 39;
    yesil.after.T2 += 10;
    changed.criticalCells.push({
      districtId: 'yesil',
      indicatorId: 'T1',
      value: 39,
    });
    changed.weakestScore += 3;
    changed.score += 3;
    const votes = votesFor(context, changed);
    expect(votes.find((vote) => vote.roleId === 'transport')!.vote).toBe(
      'against',
    );
    expect(votes.find((vote) => vote.roleId === 'finance')!.vote).toBe('for');
    expect(votes.find((vote) => vote.roleId === 'ombudsman')!.vote).toBe(
      'against',
    );
  });

  it('includes critical values in briefs for a plan that leaves them unresolved', () => {
    const context = prepareCouncil(SCENARIO.examples.trap);
    const ombudsman = context.briefs.find(
      (brief) => brief.roleId === 'ombudsman',
    )!;
    expect(ombudsman.criticalCells.length).toBeGreaterThan(0);
    expect(ombudsman.allowedNumbers).toContain(
      ombudsman.criticalCells[0].value,
    );
  });
});
