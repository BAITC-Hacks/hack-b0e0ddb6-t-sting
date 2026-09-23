import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AnthropicLlmClient } from '../../src/analysis/llm-client';
import type { LlmRequest } from '../../src/analysis/contracts';

const sdk = vi.hoisted(() => ({ create: vi.fn(), options: vi.fn() }));
vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: sdk.create };
    constructor(options: unknown) {
      sdk.options(options);
    }
  },
}));

describe('Anthropic provider adapter', () => {
  beforeEach(() => vi.clearAllMocks());
  it('forwards configured model, tools, history and cancellation signal to the SDK', async () => {
    sdk.create.mockResolvedValue({
      content: [
        { type: 'text', text: 'result' },
        {
          type: 'tool_use',
          id: 'call',
          name: 'evaluate_plan',
          input: { plan: [] },
        },
        { type: 'thinking', thinking: 'not public' },
      ],
    });
    const request: LlmRequest = {
      system: 'rules',
      tools: [],
      messages: [{ role: 'user', content: [{ type: 'text', text: 'plan' }] }],
      signal: new AbortController().signal,
    };
    const response = await new AnthropicLlmClient(
      'test-key',
      'test-model',
    ).complete(request);
    expect(response).toEqual([
      { type: 'text', text: 'result' },
      {
        type: 'tool_use',
        id: 'call',
        name: 'evaluate_plan',
        input: { plan: [] },
      },
    ]);
    expect(sdk.options).toHaveBeenCalledWith({
      apiKey: 'test-key',
      maxRetries: 0,
    });
    expect(sdk.create).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'test-model',
        system: 'rules',
        tools: [],
        messages: request.messages,
      }),
      { signal: request.signal },
    );
  });

  it('propagates provider failures to the bounded fallback handler', async () => {
    sdk.create.mockRejectedValue(new Error('unavailable'));
    await expect(
      new AnthropicLlmClient('key', 'model').complete({
        system: '',
        tools: [],
        messages: [],
        signal: new AbortController().signal,
      }),
    ).rejects.toThrow('unavailable');
  });
});
