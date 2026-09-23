import { describe, expect, it } from 'vitest';
import {
  appendEvent,
  sessionPhase,
} from '../../../src/features/council/events';
import type { CouncilEvent } from '../../../../api/src/council/types';

const opened: CouncilEvent = {
  type: 'opened',
  plan: [],
  score: 56,
  members: [],
};
const closed: CouncilEvent = { type: 'closed' };

describe('council event playback', () => {
  it('orders live events and ignores replayed IDs', () => {
    const first = appendEvent([], 2, closed);
    expect(appendEvent(first, 1, opened)).toEqual([opened, closed]);
    expect(appendEvent(first, 2, closed)).toEqual([undefined, closed]);
  });

  it('derives the current stage from received events', () => {
    expect(sessionPhase([])).toBe('preparation');
    expect(sessionPhase([opened])).toBe('round1');
    expect(
      sessionPhase([
        opened,
        {
          type: 'amendment',
          amendment: {
            id: 'a',
            replace: { measureId: 'M1' },
            with: { measureId: 'M2' },
            plan: [],
            scoreAfter: 1,
            delta: 1,
            cost: 1,
            impacts: [],
          },
        },
      ]),
    ).toBe('amendments');
    expect(
      sessionPhase([
        opened,
        { type: 'objection', roleId: 'ecology', amendmentId: 'a', text: 'x' },
      ]),
    ).toBe('round2');
    expect(
      sessionPhase([
        opened,
        { type: 'package-check', amendmentIds: [], valid: false },
      ]),
    ).toBe('packages');
    expect(sessionPhase([opened, { type: 'votes', votes: [] }])).toBe('vote');
    expect(
      sessionPhase([
        opened,
        {
          type: 'protocol',
          protocol: {
            source: 'offline',
            verified: true,
            decision: 'revise',
            recommendedAmendmentIds: [],
            plan: [],
            score: 56,
            cost: 0,
            compromises: [],
            dissent: [],
            summary: 'x',
          },
        },
      ]),
    ).toBe('protocol');
    expect(sessionPhase([opened, closed])).toBe('protocol');
    expect(sessionPhase([{ type: 'failed', message: 'error' }])).toBe('failed');
  });
});
