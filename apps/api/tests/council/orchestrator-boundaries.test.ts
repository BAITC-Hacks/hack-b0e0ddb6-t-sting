import { beforeEach, describe, expect, it, vi } from 'vitest';
import { plan } from '../analysis/fixtures';
import type {
  Brief,
  CouncilContext,
  CouncilEvent,
  Protocol,
} from '../../src/council/types';
import { evaluatePackage } from '../../src/council/amendments';
import { prepareCouncil } from '../../src/council/briefs';
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
import {
  createCouncilRunner,
  runCouncil,
} from '../../src/council/council-orchestrator';

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
  it('skips objections when the sole proposed amendment harms nobody by 0.1', async () => {
    const prepared = prepareCouncil(plan);
    const safe = prepared.amendments.find(
      (item) =>
        item.impacts.every((impact) => impact.delta > -0.1) &&
        prepared.briefs.some((brief) =>
          brief.candidates.some((candidate) => candidate.id === item.id),
        ),
    )!;
    const author = prepared.briefs.find((brief) =>
      brief.candidates.some((candidate) => candidate.id === safe.id),
    )!;
    expect(safe).toBeDefined();
    mocks.deputy.mockImplementation(
      (brief: Brief, _client: unknown, _timeout: number, round: 1 | 2 = 1) =>
        Promise.resolve(
          speech(brief, brief.roleId === author.roleId ? safe.id : null, round),
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
    expect(events.filter((event) => event.type === 'objection')).toHaveLength(
      0,
    );
    expect(mocks.deputy).toHaveBeenCalledTimes(7);
  });
  it('falls back for one failed round-two objection without losing the debate', async () => {
    mocks.deputy.mockImplementation(
      (brief: Brief, _client: unknown, _timeout: number, round: 1 | 2 = 1) =>
        brief.roleId === 'ecology' && round === 2
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
    expect(events).toContainEqual(
      expect.objectContaining({ type: 'objection', roleId: 'ecology' }),
    );
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'speech',
        round: 2,
        roleId: 'ecology',
        source: 'offline',
      }),
    );
  });
  it('handles a meeting with no proposals and skips the debate', async () => {
    mocks.deputy.mockImplementation(
      (brief: Brief, _client: unknown, _timeout: number, round: 1 | 2 = 1) =>
        Promise.resolve(speech(brief, null, round)),
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
      events.filter(
        (event) => event.type === 'amendment' || event.type === 'objection',
      ),
    ).toHaveLength(0);
    expect(events.find((event) => event.type === 'protocol')).toMatchObject({
      protocol: { decision: 'accept' },
    });
  });
  it('rejects a chair recommendation that fails the final engine check', async () => {
    mocks.chair.mockResolvedValue({
      recommendedAmendmentIds: ['unknown'],
    } as Protocol);
    await expect(
      runCouncil(
        plan,
        { deputy: null, chair: null, timeoutMs: 12000 },
        async () => {},
      ),
    ).rejects.toThrow('final validation');
  });
  it('propagates stream storage failures', async () => {
    const failure = new Error('storage');
    await expect(
      runCouncil(
        plan,
        { deputy: null, chair: null, timeoutMs: 12000 },
        async (event) => {
          if (event.type === 'speech') throw failure;
        },
      ),
    ).rejects.toBe(failure);
  });
  it.each([
    { env: {}, providers: [], timeout: 12000 },
    {
      env: {
        OPENAI_API_KEY: ' key ',
        AI_MODEL: ' primary ',
        AI_COUNCIL_MODEL: ' deputy ',
        AI_COUNCIL_TIMEOUT_MS: '5',
      },
      providers: [
        { key: 'key', model: 'deputy' },
        { key: 'key', model: 'primary' },
      ],
      timeout: 5,
    },
    {
      env: {
        OPENAI_API_KEY: 'key',
        AI_MODEL: '',
        AI_COUNCIL_MODEL: '',
        AI_COUNCIL_TIMEOUT_MS: '99999',
      },
      providers: [
        { key: 'key', model: 'gpt-4.1-mini' },
        { key: 'key', model: 'gpt-4.1-mini' },
      ],
      timeout: 12000,
    },
    {
      env: { OPENAI_API_KEY: '  ', AI_COUNCIL_TIMEOUT_MS: '-1' },
      providers: [],
      timeout: 12000,
    },
  ])(
    'selects bounded server-only provider configuration %#',
    async ({ env, providers, timeout }) => {
      const runner = createCouncilRunner(env);
      await runner(plan, async () => {});
      expect(mocks.providers).toEqual(providers);
      expect(
        mocks.deputy.mock.calls.slice(0, 7).map((call) => call[2]),
      ).toEqual(Array(7).fill(timeout));
    },
  );
});
