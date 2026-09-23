import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AnalysisService,
  createAnalysisService,
} from '../../src/analysis/analysis.service';
import { AnalysisController } from '../../src/analysis/analysis.controller';
import { fakeSimulation, plan } from './fixtures';

const adapter = vi.hoisted(() => ({
  construct: vi.fn(),
  complete: vi.fn(async () => []),
}));
vi.mock('../../src/analysis/llm-client', () => ({
  AnthropicLlmClient: class {
    complete = adapter.complete;
    constructor(key: string, model: string) {
      adapter.construct(key, model);
    }
  },
}));

describe('analysis endpoint and configuration', () => {
  afterEach(() => {
    vi.clearAllMocks();
    vi.unstubAllEnvs();
    vi.useRealTimers();
  });
  it('returns offline analysis for a valid body without provider configuration', async () => {
    const { simulation } = fakeSimulation();
    const controller = new AnalysisController(
      createAnalysisService(simulation, {}),
    );
    expect(await controller.analyze({ plan })).toMatchObject({
      source: 'offline',
      summary: expect.stringContaining('56.54'),
    });
    expect(adapter.construct).not.toHaveBeenCalled();
  });

  it('rejects malformed bodies instead of returning a plausible report', async () => {
    const { simulation } = fakeSimulation();
    const controller = new AnalysisController(
      new AnalysisService(simulation, null),
    );
    await expect(controller.analyze(null)).rejects.toThrow('plan');
  });

  it('propagates invalid plan errors before attempting analysis', async () => {
    const { simulation } = fakeSimulation();
    vi.mocked(simulation.review).mockImplementation(() => {
      throw new Error('invalid plan');
    });
    await expect(
      new AnalysisService(simulation, null).analyze(plan),
    ).rejects.toThrow('invalid plan');
  });

  it('uses configured key and model without exposing them in the response', async () => {
    const { simulation } = fakeSimulation();
    const service = createAnalysisService(simulation, {
      ANTHROPIC_API_KEY: ' key ',
      AI_MODEL: ' custom-model ',
      AI_TIMEOUT_MS: '5',
    });
    expect(await service.analyze(plan)).toMatchObject({ source: 'offline' });
    expect(adapter.construct).toHaveBeenCalledWith('key', 'custom-model');
  });

  it('honors a shorter configured deadline', async () => {
    vi.useFakeTimers();
    adapter.complete.mockImplementationOnce(() => new Promise(() => {}));
    const { simulation } = fakeSimulation();
    let resolved = false;
    const pending = createAnalysisService(simulation, {
      ANTHROPIC_API_KEY: 'key',
      AI_TIMEOUT_MS: '5',
    })
      .analyze(plan)
      .then((report) => {
        resolved = true;
        return report;
      });
    await vi.advanceTimersByTimeAsync(4);
    expect(resolved).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    expect(await pending).toMatchObject({ source: 'offline' });
  });

  it('reads process environment by default and uses the supported default model', async () => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'key');
    vi.stubEnv('AI_MODEL', '');
    vi.stubEnv('AI_TIMEOUT_MS', 'invalid');
    const { simulation } = fakeSimulation();
    await createAnalysisService(simulation).analyze(plan);
    expect(adapter.construct).toHaveBeenCalledWith(
      'key',
      'claude-sonnet-4-5-20250929',
    );
  });

  it.each(['0', '-1', '99999', 'Infinity', ''])(
    'limits invalid or oversized timeout configuration %s to 25 seconds',
    async (AI_TIMEOUT_MS) => {
      vi.useFakeTimers();
      adapter.complete.mockImplementationOnce(() => new Promise(() => {}));
      const { simulation } = fakeSimulation();
      const report = createAnalysisService(simulation, {
        ANTHROPIC_API_KEY: 'key',
        AI_TIMEOUT_MS,
      }).analyze(plan);
      await vi.advanceTimersByTimeAsync(25000);
      expect(await report).toMatchObject({ source: 'offline' });
      expect(vi.getTimerCount()).toBe(0);
    },
  );
});
