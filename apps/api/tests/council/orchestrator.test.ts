import { beforeEach, describe, expect, it, vi } from 'vitest';
import { plan } from '../analysis/fixtures';
import type {
  Brief,
  CouncilContext,
  CouncilEvent,
} from '../../src/council/types';
import { evaluatePackage } from '../../src/council/amendments';
import { prepareCouncil } from '../../src/council/briefs';
import * as briefsModule from '../../src/council/briefs';
import {
  offlineProtocol,
  offlineSpeech,
} from '../../src/council/offline-council';

const mocks = vi.hoisted(() => ({
  deputy: vi.fn(),
  chair: vi.fn(),
  providers: [] as { key: string; model: string }[],
}));
vi.mock('../../src/council/deputy-agent', () => ({
  deputySpeech: (...args: unknown[]) => mocks.deputy(...args),
}));
vi.mock('../../src/council/chair-agent', () => ({
  chairProtocol: (...args: unknown[]) => mocks.chair(...args),
}));
vi.mock('../../src/analysis/llm-client', () => ({
  OpenAiLlmClient: class {
    constructor(key: string, model: string) {
      mocks.providers.push({ key, model });
    }
  },
}));
import { runCouncil } from '../../src/council/council-orchestrator';

const speech = (
  brief: Brief,
  amendmentId: string | null,
  round: 1 | 2 = 1,
): Extract<CouncilEvent, { type: 'speech' }> => ({
  ...offlineSpeech(brief, round),
  amendmentId,
});

beforeEach(() => {
  mocks.deputy.mockReset();
  mocks.chair.mockReset();
  mocks.providers.length = 0;
  mocks.deputy.mockImplementation(
    (brief: Brief, _client: unknown, _timeout: number, round: 1 | 2 = 1) =>
      Promise.resolve(
        speech(
          brief,
          round === 1 ? (brief.candidates[0]?.id ?? null) : null,
          round,
        ),
      ),
  );
  mocks.chair.mockImplementation(async (current: CouncilContext) => {
    const leader = [...current.amendments].sort((a, b) => b.delta - a.delta)[0];
    return offlineProtocol(
      current,
      evaluatePackage(current, leader ? [leader.id] : []),
    );
  });
});

describe('council orchestrator boundaries', () => {
  it('uses only proposed amendments and makes the actual proposer answer objections', async () => {
    const events: CouncilEvent[] = [];
    await runCouncil(
      plan,
      { deputy: null, chair: null, timeoutMs: 12000 },
      async (event) => {
        events.push(event);
      },
    );
    const proposed = new Set(
      events
        .filter((event) => event.type === 'speech' && event.round === 1)
        .map((event) => (event.type === 'speech' ? event.amendmentId : null)),
    );
    expect(
      events
        .filter((event) => event.type === 'amendment')
        .every(
          (event) =>
            event.type === 'amendment' && proposed.has(event.amendment.id),
        ),
    ).toBe(true);
    const leader = events
      .filter(
        (event): event is Extract<CouncilEvent, { type: 'amendment' }> =>
          event.type === 'amendment',
      )
      .sort((a, b) => b.amendment.delta - a.amendment.delta)[0].amendment;
    const proposer = events.find(
      (event) =>
        event.type === 'speech' &&
        event.round === 1 &&
        event.amendmentId === leader.id,
    );
    const authorCall = mocks.deputy.mock.calls.find(
      (call) => call[3] === 2 && String(call[4]).includes('Ответь'),
    );
    expect(authorCall?.[0].roleId).toBe(
      proposer?.type === 'speech' ? proposer.roleId : null,
    );
    expect(events.at(-1)?.type).toBe('closed');
  });
  it('substitutes one failed deputy while preserving all seven speakers', async () => {
    mocks.deputy.mockImplementation(
      (brief: Brief, _client: unknown, _timeout: number, round: 1 | 2 = 1) =>
        brief.roleId === 'transport' && round === 1
          ? Promise.reject(new Error('provider'))
          : Promise.resolve(
              speech(
                brief,
                round === 1 ? (brief.candidates[0]?.id ?? null) : null,
                round,
              ),
            ),
    );
    const events: CouncilEvent[] = [];
    await runCouncil(
      plan,
      { deputy: null, chair: null, timeoutMs: 12000 },
      async (event) => {
        events.push(event);
      },
    );
    expect(
      events.filter((event) => event.type === 'speech' && event.round === 1),
    ).toHaveLength(7);
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'speech',
        round: 1,
        roleId: 'transport',
        source: 'offline',
      }),
    );
  });
  it('orders two objections by the size of the engine loss', async () => {
    const prepared = prepareCouncil(plan);
    const proposed = prepared.briefs
      .map((brief) => brief.candidates[0]?.id)
      .filter((id): id is string => !!id);
    const leader = prepared.amendments
      .filter((item) => proposed.includes(item.id))
      .sort((a, b) => b.delta - a.delta)[0];
    const ecology = leader.impacts.find(
      (impact) => impact.roleId === 'ecology',
    )!;
    const safety = leader.impacts.find((impact) => impact.roleId === 'safety')!;
    ecology.delta = -0.15;
    safety.delta = -0.3;
    const spy = vi
      .spyOn(briefsModule, 'prepareCouncil')
      .mockReturnValue(prepared);
    try {
      const events: CouncilEvent[] = [];
      await runCouncil(
        plan,
        { deputy: null, chair: null, timeoutMs: 12000 },
        async (event) => {
          events.push(event);
        },
      );
      expect(
        events
          .filter((event) => event.type === 'objection')
          .map((event) => (event.type === 'objection' ? event.roleId : null)),
      ).toEqual(['safety', 'ecology']);
    } finally {
      spy.mockRestore();
    }
  });
});
