import { describe, expect, it } from 'vitest';
import { evaluatePackage } from '../../src/council/amendments';
import { prepareCouncil } from '../../src/council/briefs';
import { checkedProtocol } from '../../src/council/protocol-parser';
import type { PackageCheck } from '../../src/council/types';
import { SCENARIO } from '../../src/simulation/engine/scenario';

const context = prepareCouncil(SCENARIO.examples.strong);
const lrtId = 'swap:M5@saryarka>M3@nura';
const ecologyId = 'swap:M5@saryarka>M6@city';
const check = evaluatePackage(context, [lrtId]);
const accepted = {
  decision: 'amend',
  recommendedAmendmentIds: [lrtId],
  summary: 'ЛРТ в Нуре: Score 57.21, стоимость 100.',
  compromises: [
    {
      amendmentId: ecologyId,
      scoreCost: 0.44,
      text: 'Цена экологического варианта — 0.44 балла.',
    },
  ],
  dissent: [
    { roleId: 'ecology', text: 'Экологическая метрика снижается на 0.16.' },
  ],
};
const parse = (value: unknown, checks: PackageCheck[] = [check]) =>
  checkedProtocol(JSON.stringify(value), context, checks);

describe('checked chair protocol', () => {
  it('uses the engine plan, score and cost even if the model supplies different totals', () => {
    const protocol = parse({ ...accepted, score: 999, cost: 1, plan: [] });
    expect(protocol).toMatchObject({
      source: 'llm',
      verified: true,
      decision: 'amend',
      plan: [
        { measureId: 'M7', districtId: 'nura' },
        { measureId: 'M8', districtId: 'nura' },
        { measureId: 'M10', districtId: 'nura' },
        { measureId: 'M12' },
        { measureId: 'M3', districtId: 'nura' },
      ],
      cost: 100,
      compromises: [{ amendmentId: ecologyId, scoreCost: 0.44 }],
      dissent: [{ roleId: 'ecology', text: accepted.dissent[0].text }],
    });
    expect(protocol.score).toBeCloseTo(57.20556, 5);
  });

  it('does not let an earlier invalid attempt hide a later verified package', () => {
    const protocol = parse(accepted, [
      { amendmentIds: ['unknown'], valid: false, reason: 'Unknown amendment.' },
      evaluatePackage(context, []),
      check,
    ]);
    expect(protocol.recommendedAmendmentIds).toEqual([lrtId]);
    expect(protocol.cost).toBe(100);
  });

  it('accepts the unchanged original plan only after an explicit engine check', () => {
    const protocol = parse(
      {
        decision: 'accept',
        recommendedAmendmentIds: [],
        summary: 'Исходный план подтверждён.',
        compromises: [],
        dissent: [],
      },
      [evaluatePackage(context, [])],
    );
    expect(protocol.plan).toEqual(SCENARIO.examples.strong);
    expect(protocol.score).toBeCloseTo(56.54307, 5);
    expect(protocol.decision).toBe('accept');
  });

  it.each([null, false, 'protocol', 7])(
    'rejects a non-object response: %s',
    (value) => {
      expect(() => parse(value)).toThrow('Invalid protocol');
    },
  );
  it('rejects malformed JSON', () => {
    expect(() => checkedProtocol('{', context, [check])).toThrow();
  });
  it.each([undefined, null, 'id', [1]])(
    'rejects malformed recommendation IDs: %s',
    (ids) => {
      expect(() =>
        parse({ ...accepted, recommendedAmendmentIds: ids }),
      ).toThrow('Invalid recommendation');
    },
  );
  it.each([
    [],
    [{ ...check, valid: false }],
    [{ ...check, plan: undefined }],
    [{ ...check, score: undefined }],
    [{ ...check, cost: undefined }],
  ])(
    'rejects recommendations without a complete successful engine result',
    (...entries) => {
      expect(() => parse(accepted, entries as PackageCheck[])).toThrow(
        'Unchecked recommendation',
      );
    },
  );
  it('rejects an amendment that the chair never checked', () => {
    expect(() =>
      parse({ ...accepted, recommendedAmendmentIds: [ecologyId] }),
    ).toThrow('Unchecked recommendation');
  });
  it.each([
    { decision: 'approved' },
    { summary: null },
    { summary: '  ' },
    { compromises: {} },
    { dissent: null },
  ])('rejects an incomplete protocol: %j', (patch) => {
    expect(() => parse({ ...accepted, ...patch })).toThrow('Invalid protocol');
  });
  it('rejects an unsupported number in the summary', () => {
    expect(() => parse({ ...accepted, summary: 'Score 999.' })).toThrow(
      'Unsupported number',
    );
  });
  it.each([
    null,
    'compromise',
    {},
    { ...accepted.compromises[0], scoreCost: '0.44' },
    { ...accepted.compromises[0], scoreCost: 9 },
    { ...accepted.compromises[0], text: null },
    { ...accepted.compromises[0], text: 'Цена 999 баллов.' },
  ])('rejects an unverified compromise: %j', (compromise) => {
    expect(() => parse({ ...accepted, compromises: [compromise] })).toThrow(
      'Invalid compromise',
    );
  });
  it.each([
    null,
    'dissent',
    {},
    { roleId: 'ecology', text: null },
    { roleId: 'ecology', text: 'Потеря 999 баллов.' },
  ])('rejects an invalid dissent: %j', (dissent) => {
    expect(() => parse({ ...accepted, dissent: [dissent] })).toThrow(
      'Invalid dissent',
    );
  });
});
