import { describe, expect, it, vi } from 'vitest';
import type { LlmClient } from '../../src/analysis/contracts';
import { plan } from '../analysis/fixtures';
import { prepareCouncil } from '../../src/council/briefs';
import { deputySpeech } from '../../src/council/deputy-agent';
import { chairProtocol } from '../../src/council/chair-agent';
import type { CouncilEvent } from '../../src/council/types';

const client = (text: string): LlmClient => ({
  complete: vi.fn().mockResolvedValue([{ type: 'text', text }]),
});
const context = prepareCouncil(plan);

describe('bounded council failures', () => {
  it('allows a cited three-decimal impact from the round-two engine facts', async () => {
    const brief = context.briefs.find((item) => item.roleId === 'finance')!;
    const speech = await deputySpeech(
      brief,
      client('{"speech":"Моя метрика растёт на 0.045.","amendmentId":null}'),
      12000,
      2,
      JSON.stringify({ impact: { delta: 0.045 } }),
    );
    expect(speech).toMatchObject({ source: 'llm', round: 2, verified: true });
  });
  it('falls back for tool blocks in a deputy response', async () => {
    const brief = context.briefs[0];
    const reply: LlmClient = {
      complete: async () => [
        { type: 'tool_use', id: 'x', name: 'check', input: {} },
      ],
    };
    expect(await deputySpeech(brief, reply, 12000)).toMatchObject({
      source: 'offline',
    });
  });
  it('rejects malformed chair package input and emits the rejected attempt', async () => {
    const events: CouncilEvent[] = [];
    const fake: LlmClient = {
      complete: vi
        .fn()
        .mockResolvedValueOnce([
          {
            type: 'tool_use',
            id: 'x',
            name: 'evaluate_package',
            input: { amendmentIds: 'bad' },
          },
        ])
        .mockResolvedValueOnce([{ type: 'text', text: '{}' }]),
    };
    await chairProtocol(context, [], fake, async (event) => {
      events.push(event);
    });
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'package-check',
        valid: false,
        reason: 'Неверный формат пакета.',
      }),
    );
  });
  it('propagates persistence errors instead of silently publishing a fallback', async () => {
    const failure = new Error('storage unavailable');
    await expect(
      chairProtocol(context, [], null, async () => {
        throw failure;
      }),
    ).rejects.toBe(failure);
  });
  it('enforces a chair deadline even if the provider never answers', async () => {
    vi.useFakeTimers();
    const pending = chairProtocol(
      context,
      [],
      { complete: () => new Promise(() => {}) },
      async () => {},
      5,
    );
    await vi.advanceTimersByTimeAsync(5);
    expect((await pending).source).toBe('offline');
    vi.useRealTimers();
  });
});

describe('chair tool boundaries', () => {
  it('returns verified impact facts to the next model turn', async () => {
    const amendment = context.amendments[0];
    const complete = vi
      .fn()
      .mockResolvedValueOnce([
        {
          type: 'tool_use',
          id: 'impact',
          name: 'get_amendment_impacts',
          input: { amendmentId: amendment.id },
        },
      ])
      .mockResolvedValueOnce([{ type: 'text', text: '{}' }]);
    await chairProtocol(context, [], { complete }, async () => {});
    expect(complete.mock.calls[1][0].messages.at(-1).content).toContainEqual({
      type: 'tool_result',
      tool_use_id: 'impact',
      content: JSON.stringify(amendment.impacts),
    });
  });
  it('reports unknown tools and amendment impacts as errors to the model', async () => {
    const complete = vi
      .fn()
      .mockResolvedValueOnce([
        { type: 'tool_use', id: 'unknown', name: 'other', input: {} },
        {
          type: 'tool_use',
          id: 'missing',
          name: 'get_amendment_impacts',
          input: { amendmentId: 'missing' },
        },
      ])
      .mockResolvedValueOnce([{ type: 'text', text: '{}' }]);
    await chairProtocol(context, [], { complete }, async () => {});
    expect(complete.mock.calls[1][0].messages.at(-1).content).toEqual([
      {
        type: 'tool_result',
        tool_use_id: 'unknown',
        content: '{"error":"Unknown tool"}',
      },
      {
        type: 'tool_result',
        tool_use_id: 'missing',
        content: '{"error":"Unknown amendment"}',
      },
    ]);
  });
  it('falls back when a model requests more than four tools in one turn', async () => {
    const complete = vi.fn().mockResolvedValue(
      Array.from({ length: 5 }, (_, index) => ({
        type: 'tool_use',
        id: String(index),
        name: 'get_amendment_impacts',
        input: {},
      })),
    );
    const result = await chairProtocol(
      context,
      [],
      { complete },
      async () => {},
    );
    expect(result.source).toBe('offline');
    expect(complete).toHaveBeenCalledTimes(1);
  });
  it('emits a failed check when the engine cannot evaluate a malformed context', async () => {
    const events: CouncilEvent[] = [];
    const malformed = { ...context, plan: null as unknown as typeof plan };
    const fake: LlmClient = {
      complete: vi
        .fn()
        .mockResolvedValueOnce([
          {
            type: 'tool_use',
            id: 'check',
            name: 'evaluate_package',
            input: { amendmentIds: [] },
          },
        ])
        .mockResolvedValueOnce([{ type: 'text', text: '{}' }]),
    };
    await chairProtocol(malformed, [], fake, async (event) => {
      events.push(event);
    });
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'package-check',
        valid: false,
        reason: 'Движок отклонил пакет.',
      }),
    );
  });
});

it('uses a factual generic offline objection when no round-two topic is available', async () => {
  const { offlineSpeech } = await import('../../src/council/offline-council');
  expect(offlineSpeech(context.briefs[0], 2)).toMatchObject({
    round: 2,
    text: expect.stringContaining('прошу учесть влияние'),
  });
});

describe('chair cancellation and storage', () => {
  it('propagates a package-check persistence failure from a model tool call', async () => {
    const failure = new Error('storage');
    const fake: LlmClient = {
      complete: async () => [
        {
          type: 'tool_use',
          id: 'check',
          name: 'evaluate_package',
          input: { amendmentIds: [] },
        },
      ],
    };
    await expect(
      chairProtocol(context, [], fake, async () => {
        throw failure;
      }),
    ).rejects.toBe(failure);
  });
  it('does not execute a late model answer after its deadline', async () => {
    vi.useFakeTimers();
    const fake: LlmClient = {
      complete: () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve([
                {
                  type: 'tool_use',
                  id: 'check',
                  name: 'evaluate_package',
                  input: { amendmentIds: [] },
                },
              ]),
            5,
          ),
        ),
    };
    const events: CouncilEvent[] = [];
    const pending = chairProtocol(
      context,
      [],
      fake,
      async (event) => {
        events.push(event);
      },
      5,
    );
    await vi.runAllTimersAsync();
    expect((await pending).source).toBe('offline');
    expect(
      events.filter((event) => event.type === 'package-check').length,
    ).toBeGreaterThan(0);
    vi.useRealTimers();
  });
  it('handles a missing impact-tool argument as an unknown amendment', async () => {
    const complete = vi
      .fn()
      .mockResolvedValueOnce([
        {
          type: 'tool_use',
          id: 'impact',
          name: 'get_amendment_impacts',
          input: null,
        },
      ])
      .mockResolvedValueOnce([{ type: 'text', text: '{}' }]);
    await chairProtocol(context, [], { complete }, async () => {});
    expect(complete.mock.calls[1][0].messages.at(-1).content).toContainEqual({
      type: 'tool_result',
      tool_use_id: 'impact',
      content: '{"error":"Unknown amendment"}',
    });
  });
});
