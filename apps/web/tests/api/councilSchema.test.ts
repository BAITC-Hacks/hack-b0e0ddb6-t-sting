import { describe, expect, it } from 'vitest';
import {
  isCouncilEvent,
  isPlan,
  isProtocol,
} from '../../src/api/councilSchema';

const amendment = {
  id: 'a1',
  replace: { measureId: 'M1' },
  with: { measureId: 'M2' },
  plan: [{ measureId: 'M2' }],
  scoreAfter: 55,
  delta: 1,
  cost: 20,
  impacts: [{ roleId: 'transport', before: 10, after: 11, delta: 1 }],
};
const protocol = {
  source: 'offline',
  verified: true,
  decision: 'amend',
  recommendedAmendmentIds: ['a1'],
  plan: amendment.plan,
  score: 55,
  cost: 20,
  compromises: [{ amendmentId: 'a1', scoreCost: 0.2, text: 'tradeoff' }],
  dissent: [{ roleId: 'ecology', text: 'disagree' }],
  summary: 'Accepted.',
};

describe('Council data validation', () => {
  it('accepts complete event variants used by the live UI', () => {
    const events = [
      {
        type: 'opened',
        plan: amendment.plan,
        score: 54,
        members: [
          {
            id: 'chair',
            title: 'Chair',
            emoji: '⚖️',
            metric: 'Score',
            character: 'fair',
          },
        ],
      },
      {
        type: 'speech',
        round: 1,
        roleId: 'transport',
        stance: 'for',
        text: 'Yes.',
        amendmentId: null,
        source: 'llm',
        verified: true,
      },
      {
        type: 'speech',
        round: 2,
        roleId: 'transport',
        stance: 'conditional',
        text: 'Maybe.',
        amendmentId: 'a1',
        source: 'offline',
        verified: false,
      },
      { type: 'amendment', amendment },
      { type: 'objection', roleId: 'ecology', amendmentId: 'a1', text: 'No.' },
      {
        type: 'package-check',
        amendmentIds: ['a1'],
        valid: true,
        score: 55,
        cost: 20,
      },
      {
        type: 'package-check',
        amendmentIds: ['a1'],
        valid: false,
        reason: 'Over budget',
      },
      {
        type: 'votes',
        votes: [{ roleId: 'transport', vote: 'for', delta: 1 }],
      },
      { type: 'protocol', protocol },
      { type: 'closed' },
      { type: 'failed', message: 'Failed' },
    ];
    expect(events.every(isCouncilEvent)).toBe(true);
    expect(isPlan(amendment.plan)).toBe(true);
    expect(isProtocol(protocol)).toBe(true);
  });

  it('rejects missing nested fields, unknown types and nonfinite figures', () => {
    expect(isCouncilEvent(null)).toBe(false);
    expect(isCouncilEvent({ type: 'unknown' })).toBe(false);
    expect(
      isCouncilEvent({
        type: 'speech',
        round: 1,
        roleId: 'transport',
        stance: 'for',
        text: 'Yes.',
        source: 'llm',
        verified: true,
      }),
    ).toBe(false);
    expect(
      isCouncilEvent({
        type: 'speech',
        round: 1,
        roleId: 'transport',
        stance: 'for',
        text: 'Yes.',
        amendmentId: 3,
        source: 'llm',
        verified: true,
      }),
    ).toBe(false);
    expect(
      isCouncilEvent({
        type: 'amendment',
        amendment: { ...amendment, scoreAfter: Infinity },
      }),
    ).toBe(false);
    expect(
      isCouncilEvent({
        type: 'protocol',
        protocol: { ...protocol, compromises: [{}] },
      }),
    ).toBe(false);
    expect(isPlan([{ measureId: 'M99' }])).toBe(false);
    expect(isProtocol(null)).toBe(false);
  });
});
