import { afterEach, describe, expect, it, vi } from 'vitest';
import { runAnalyst } from '../../src/analysis/analyst-agent';
import type {
  LlmClient,
  LlmBlock,
  LlmRequest,
} from '../../src/analysis/contracts';
import { fakeSimulation, finalReport, plan } from './fixtures';

const calls: LlmBlock[] = [
  { type: 'tool_use', id: 'eval', name: 'evaluate_plan', input: { plan } },
  {
    type: 'tool_use',
    id: 'swaps',
    name: 'find_best_swaps',
    input: { plan, limit: 2 },
  },
];
function scripted(responses: LlmBlock[][]) {
  const requests: LlmRequest[] = [];
  const client: LlmClient = {
    complete: vi.fn(async (request: LlmRequest) => {
      requests.push(
        structuredClone({
          ...request,
          signal: undefined,
        }) as unknown as LlmRequest,
      );
      return responses.shift()!;
    }),
  };
  return { client, requests };
}

describe('bounded analyst agent', () => {
  afterEach(() => vi.useRealTimers());

  it('executes tools, sends factual outputs back and validates the final JSON', async () => {
    const { simulation, review, scenario } = fakeSimulation();
    const { client, requests } = scripted([
      calls,
      [
        {
          type: 'text',
          text: JSON.stringify({ ...finalReport, summary: 'Score 56.54.' }),
        },
      ],
    ]);
    const report = await runAnalyst(
      plan,
      review,
      scenario,
      simulation,
      client,
      25000,
    );
    expect(report.source).toBe('llm');
    expect(report.summary).toBe('Score 56.54.');
    expect(report.trace).toHaveLength(2);
    expect(report.trace[0]).toMatchObject({
      tool: 'evaluate_plan',
      input: { plan },
      output: { evaluation: { score: 56.54 } },
    });
    expect(requests[1].messages[2].content).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          type: 'tool_result',
          tool_use_id: 'eval',
          content: expect.stringContaining('56.54'),
        }),
      ]),
    );
  });

  it('falls back without a provider while preserving the offline scenario', async () => {
    const { simulation, review, scenario } = fakeSimulation();
    expect(
      await runAnalyst(plan, review, scenario, simulation, null, 25000),
    ).toMatchObject({
      source: 'offline',
      summary: expect.stringContaining('56.54'),
      trace: [],
    });
  });

  it.each([
    [{ type: 'text', text: 'not JSON' }],
    [
      {
        type: 'text',
        text: JSON.stringify({ ...finalReport, summary: 'Score 99999.' }),
      },
    ],
    [],
    [{ type: 'tool_result', tool_use_id: 'fake', content: 'x' }],
  ] satisfies LlmBlock[][])(
    'falls back on malformed output or unsupported facts',
    async (...content) => {
      const { simulation, review, scenario } = fakeSimulation();
      const { client } = scripted([calls, content]);
      expect(
        (await runAnalyst(plan, review, scenario, simulation, client, 25000))
          .source,
      ).toBe('offline');
    },
  );

  it('requires evidence and checked recommendations before accepting an answer', async () => {
    const { simulation, review, scenario } = fakeSimulation();
    const { client } = scripted([
      [{ type: 'text', text: JSON.stringify(finalReport) }],
    ]);
    expect(
      (await runAnalyst(plan, review, scenario, simulation, client, 25000))
        .source,
    ).toBe('offline');
  });

  it('falls back on provider failure without leaking secrets into the report', async () => {
    const { simulation, review, scenario } = fakeSimulation();
    const client: LlmClient = {
      complete: async () => {
        throw new Error('secret-key');
      },
    };
    const report = await runAnalyst(
      plan,
      review,
      scenario,
      simulation,
      client,
      25000,
    );
    expect(report.source).toBe('offline');
    expect(JSON.stringify(report)).not.toContain('secret-key');
  });

  it('falls back on invalid tool arguments and records a sanitized failed call', async () => {
    const { simulation, review, scenario } = fakeSimulation();
    const { client } = scripted([
      [
        {
          type: 'tool_use',
          id: 'x',
          name: 'evaluate_plan',
          input: { plan: null },
        },
      ],
    ]);
    const report = await runAnalyst(
      plan,
      review,
      scenario,
      simulation,
      client,
      25000,
    );
    expect(report.source).toBe('offline');
    expect(report.trace).toEqual([
      {
        tool: 'evaluate_plan',
        input: { plan: null },
        output: { error: 'Инструмент отклонил запрос.' },
      },
    ]);
  });

  it('stops after six provider turns', async () => {
    const { simulation, review, scenario } = fakeSimulation();
    const { client } = scripted(Array.from({ length: 6 }, () => calls));
    const report = await runAnalyst(
      plan,
      review,
      scenario,
      simulation,
      client,
      25000,
    );
    expect(report.source).toBe('offline');
    expect(report.trace).toHaveLength(12);
    expect(client.complete).toHaveBeenCalledTimes(6);
  });

  it('rejects oversized tool batches instead of allowing unbounded execution', async () => {
    const { simulation, review, scenario } = fakeSimulation();
    const { client } = scripted([Array.from({ length: 9 }, () => calls[0])]);
    expect(
      (await runAnalyst(plan, review, scenario, simulation, client, 25000))
        .source,
    ).toBe('offline');
    expect(simulation.evaluate).not.toHaveBeenCalled();
  });

  it('aborts the pending provider request on the overall deadline', async () => {
    vi.useFakeTimers();
    const { simulation, review, scenario } = fakeSimulation();
    let signal: AbortSignal;
    const client: LlmClient = {
      complete: (request) => {
        signal = request.signal;
        return new Promise(() => {});
      },
    };
    const pending = runAnalyst(plan, review, scenario, simulation, client, 25);
    await vi.advanceTimersByTimeAsync(25);
    expect(await pending).toMatchObject({ source: 'offline' });
    expect(signal!.aborted).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('ignores a late provider response after the deadline and never executes its tools', async () => {
    vi.useFakeTimers();
    const { simulation, review, scenario } = fakeSimulation();
    let resolve: (blocks: LlmBlock[]) => void;
    const client: LlmClient = {
      complete: () =>
        new Promise((done) => {
          resolve = done;
        }),
    };
    const pending = runAnalyst(plan, review, scenario, simulation, client, 25);
    await vi.advanceTimersByTimeAsync(25);
    const report = await pending;
    resolve!(calls);
    await Promise.resolve();
    expect(simulation.evaluate).not.toHaveBeenCalled();
    expect(report).toMatchObject({ source: 'offline', trace: [] });
  });
});
