import { describe, expect, it, vi } from 'vitest';
import type { LlmClient } from '../../src/analysis/contracts';
import { plan } from '../analysis/fixtures';
import { prepareCouncil } from '../../src/council/briefs';
import { deputySpeech } from '../../src/council/deputy-agent';
import { chairProtocol } from '../../src/council/chair-agent';
import { runCouncil } from '../../src/council/council-orchestrator';
import type { CouncilEvent } from '../../src/council/types';

const client = (text: string): LlmClient => ({
  complete: vi.fn().mockResolvedValue([{ type: 'text', text }]),
});
const context = prepareCouncil(plan);

describe('deputy agent', () => {
  const brief = context.briefs.find((item) => item.candidates.length)!;
  it('accepts a concise response using a permitted amendment and number', async () => {
    const result = await deputySpeech(
      brief,
      client(
        JSON.stringify({
          speech: `Поддерживаю ${brief.allowedNumbers[0].toFixed(2)} балла.`,
          amendmentId: brief.candidates[0].id,
        }),
      ),
      12000,
    );
    expect(result).toMatchObject({
      source: 'llm',
      verified: true,
      amendmentId: brief.candidates[0].id,
    });
  });
  it.each([
    '{bad',
    'null',
    JSON.stringify({ speech: 'Выдумал 9999 баллов.', amendmentId: null }),
    JSON.stringify({ speech: 'Предлагаю M999.', amendmentId: null }),
    JSON.stringify({ speech: 'Предлагаю 999abc.', amendmentId: null }),
    JSON.stringify({ speech: 'Прирост 1e9.', amendmentId: null }),
    JSON.stringify({ speech: 'Предлагаю поправку.', amendmentId: 'unknown' }),
    JSON.stringify({ speech: '   ', amendmentId: null }),
  ])('falls back for unverified output %s', async (reply) => {
    expect(await deputySpeech(brief, client(reply), 12000)).toMatchObject({
      source: 'offline',
      verified: true,
    });
  });
  it('falls back when its own provider call stalls', async () => {
    vi.useFakeTimers();
    const pending = deputySpeech(
      brief,
      { complete: () => new Promise(() => {}) },
      5,
    );
    await vi.advanceTimersByTimeAsync(5);
    expect(await pending).toMatchObject({ source: 'offline' });
    vi.useRealTimers();
  });
});

describe('chair agent', () => {
  it('emits an invalid package attempt and excludes it from recommendation', async () => {
    const events: CouncilEvent[] = [];
    const fake: LlmClient = {
      complete: vi
        .fn()
        .mockResolvedValueOnce([
          {
            type: 'tool_use',
            id: '1',
            name: 'evaluate_package',
            input: { amendmentIds: ['unknown'] },
          },
        ])
        .mockResolvedValueOnce([
          {
            type: 'text',
            text: JSON.stringify({
              decision: 'amend',
              recommendedAmendmentIds: ['unknown'],
              summary: 'Принять.',
              compromises: [],
              dissent: [],
            }),
          },
        ]),
    };
    const result = await chairProtocol(context, [], fake, async (event) => {
      events.push(event);
    });
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'package-check',
        valid: false,
        amendmentIds: ['unknown'],
      }),
    );
    expect(result).toMatchObject({ source: 'offline', verified: true });
    expect(result.recommendedAmendmentIds).not.toContain('unknown');
  });
  it('accepts only a checked valid recommendation', async () => {
    const id = context.amendments.find((item) => item.delta > 0)!.id;
    const fake: LlmClient = {
      complete: vi
        .fn()
        .mockResolvedValueOnce([
          {
            type: 'tool_use',
            id: '1',
            name: 'evaluate_package',
            input: { amendmentIds: [id] },
          },
        ])
        .mockResolvedValueOnce([
          {
            type: 'text',
            text: JSON.stringify({
              decision: 'amend',
              recommendedAmendmentIds: [id],
              summary: 'Принять проверенную поправку.',
              compromises: [],
              dissent: [],
            }),
          },
        ]),
    };
    const events: CouncilEvent[] = [];
    const result = await chairProtocol(context, [], fake, async (event) => {
      events.push(event);
    });
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'package-check',
        valid: true,
        amendmentIds: [id],
      }),
    );
    expect(result).toMatchObject({
      source: 'llm',
      verified: true,
      recommendedAmendmentIds: [id],
    });
  });
  it('falls back when the chair exceeds its four-step budget', async () => {
    const fake: LlmClient = {
      complete: vi.fn().mockResolvedValue([
        {
          type: 'tool_use',
          id: '1',
          name: 'get_amendment_impacts',
          input: { amendmentId: 'unknown' },
        },
      ]),
    };
    const result = await chairProtocol(context, [], fake, async () => {});
    expect(result.source).toBe('offline');
  });
});

describe('council orchestration', () => {
  it('finishes an offline session with verified events, votes and protocol in order', async () => {
    const events: CouncilEvent[] = [];
    await runCouncil(
      plan,
      { deputy: null, chair: null, timeoutMs: 12000 },
      async (event) => {
        events.push(event);
      },
    );
    expect(events[0].type).toBe('opened');
    expect(
      events.filter((event) => event.type === 'speech' && event.round === 1),
    ).toHaveLength(7);
    expect(events.some((event) => event.type === 'package-check')).toBe(true);
    expect(events.filter((event) => event.type === 'objection')).toContainEqual(
      expect.objectContaining({
        roleId: 'ecology',
        text: expect.stringContaining('снижается с'),
      }),
    );
    expect(events.at(-3)?.type).toBe('votes');
    expect(events.at(-2)?.type).toBe('protocol');
    expect(events.at(-1)?.type).toBe('closed');
  });
});

describe('offline council tradeoffs', () => {
  it('checks conflicting and viable packages before recommending the best verified score', async () => {
    const events: CouncilEvent[] = [];
    await runCouncil(
      plan,
      { deputy: null, chair: null, timeoutMs: 12000 },
      async (event) => {
        events.push(event);
      },
    );
    const checks = events.filter(
      (event): event is Extract<CouncilEvent, { type: 'package-check' }> =>
        event.type === 'package-check',
    );
    const protocol = events.find(
      (event): event is Extract<CouncilEvent, { type: 'protocol' }> =>
        event.type === 'protocol',
    )!.protocol;
    expect(checks).toContainEqual(
      expect.objectContaining({ valid: false, cost: 104 }),
    );
    expect(checks).toContainEqual(
      expect.objectContaining({ valid: true, score: expect.closeTo(56.96, 2) }),
    );
    expect(protocol).toMatchObject({
      score: expect.closeTo(57.21, 2),
      recommendedAmendmentIds: expect.any(Array),
      source: 'offline',
    });
    expect(protocol.compromises).toContainEqual(
      expect.objectContaining({ scoreCost: expect.closeTo(0.44, 2) }),
    );
    expect(protocol.dissent).toContainEqual(
      expect.objectContaining({ roleId: 'ecology' }),
    );
    expect(protocol.summary).toContain('Экономия бюджета');
  });
});

describe('offline protocol boundaries', () => {
  it('accepts a verified unchanged plan without claiming an amendment', async () => {
    const events: CouncilEvent[] = [];
    const empty = { ...context, amendments: [] };
    const result = await chairProtocol(empty, [], null, async (event) => {
      events.push(event);
    });
    expect(result).toMatchObject({
      decision: 'accept',
      recommendedAmendmentIds: [],
      plan,
    });
    expect(result.summary).toContain('Исходный план');
    expect(events).toContainEqual(
      expect.objectContaining({
        type: 'package-check',
        amendmentIds: [],
        valid: true,
      }),
    );
  });
  it('describes a new critical cell as the reason for dissent when the metric rises', async () => {
    const before = context.evaluation;
    const districts = before.districts.map((district) => ({
      ...district,
      after: { ...district.after },
    }));
    districts[0].after.T1 = 39;
    districts[1].after.T1 += 50;
    const evaluation = {
      ...before,
      districts,
      criticalCells: [
        {
          districtId: districts[0].districtId,
          indicatorId: 'T1' as const,
          value: 39,
        },
      ],
    };
    const { offlineProtocol } =
      await import('../../src/council/offline-council');
    const protocol = offlineProtocol(context, {
      amendmentIds: [],
      valid: true,
      plan,
      evaluation,
      score: before.score,
      cost: before.cost,
    });
    expect(protocol.dissent).toContainEqual({
      roleId: 'transport',
      text: 'В зоне участника появляется новый критический показатель.',
    });
  });
});
