import { afterEach, describe, expect, it, vi } from 'vitest';
import { OpenAiLlmClient } from '../../src/analysis/llm-client';
import type { LlmRequest } from '../../src/analysis/contracts';

const request: LlmRequest = {
  system: 'rules',
  tools: [
    {
      name: 'check',
      description: 'Check',
      input_schema: {
        type: 'object',
        properties: { id: { type: 'string' } },
        required: ['id'],
        additionalProperties: false,
      },
    },
  ],
  messages: [
    { role: 'user', content: [{ type: 'text', text: 'plan' }] },
    {
      role: 'assistant',
      content: [
        { type: 'text', text: 'checking' },
        { type: 'tool_use', id: 'call', name: 'check', input: { id: 'a' } },
      ],
    },
    {
      role: 'user',
      content: [
        { type: 'tool_result', tool_use_id: 'call', content: '{"ok":true}' },
      ],
    },
  ],
  signal: new AbortController().signal,
};

afterEach(() => vi.unstubAllGlobals());

describe('OpenAI provider adapter', () => {
  it('preserves a tool-only assistant message without inventing text', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'Confirmed.' } }] }),
    });
    vi.stubGlobal('fetch', fetcher);
    const response = await new OpenAiLlmClient('key', 'model').complete({
      ...request,
      messages: [
        {
          role: 'assistant',
          content: [
            { type: 'tool_use', id: 'call', name: 'check', input: { id: 'a' } },
          ],
        },
      ],
    });
    expect(response).toEqual([{ type: 'text', text: 'Confirmed.' }]);
    expect(JSON.parse(fetcher.mock.calls[0][1].body).messages).toEqual([
      { role: 'system', content: 'rules' },
      {
        role: 'assistant',
        content: null,
        tool_calls: [
          {
            id: 'call',
            type: 'function',
            function: { name: 'check', arguments: '{"id":"a"}' },
          },
        ],
      },
    ]);
  });

  it('translates neutral tool history and response blocks', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: 'result',
              tool_calls: [
                {
                  id: 'next',
                  type: 'function',
                  function: { name: 'check', arguments: '{"id":"b"}' },
                },
              ],
            },
          },
        ],
      }),
    });
    vi.stubGlobal('fetch', fetcher);
    const response = await new OpenAiLlmClient('key', 'gpt-4.1-mini').complete(
      request,
    );
    expect(response).toEqual([
      { type: 'text', text: 'result' },
      { type: 'tool_use', id: 'next', name: 'check', input: { id: 'b' } },
    ]);
    const [url, options] = fetcher.mock.calls[0];
    expect(url).toBe('https://api.openai.com/v1/chat/completions');
    expect(options.headers.Authorization).toBe('Bearer key');
    expect(options.signal).toBe(request.signal);
    expect(JSON.parse(options.body)).toEqual({
      model: 'gpt-4.1-mini',
      max_completion_tokens: 3500,
      messages: [
        { role: 'system', content: 'rules' },
        { role: 'user', content: 'plan' },
        {
          role: 'assistant',
          content: 'checking',
          tool_calls: [
            {
              id: 'call',
              type: 'function',
              function: { name: 'check', arguments: '{"id":"a"}' },
            },
          ],
        },
        { role: 'tool', tool_call_id: 'call', content: '{"ok":true}' },
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'check',
            description: 'Check',
            parameters: request.tools[0].input_schema,
          },
        },
      ],
    });
  });

  it('rejects provider errors and malformed responses', async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ choices: [] }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                tool_calls: [
                  { id: 'x', function: { name: 'check', arguments: '{bad' } },
                ],
              },
            },
          ],
        }),
      });
    vi.stubGlobal('fetch', fetcher);
    const client = new OpenAiLlmClient('key', 'model');
    await expect(client.complete(request)).rejects.toThrow('503');
    await expect(client.complete(request)).rejects.toThrow('Malformed');
    await expect(client.complete(request)).rejects.toThrow('Malformed');
  });
});

describe('OpenAI response validation', () => {
  const base = { ...request, messages: [], tools: [] };
  it.each([
    null,
    {},
    { choices: null },
    { choices: [] },
    { choices: [{ message: null }] },
    { choices: [{ message: { content: '' } }] },
    { choices: [{ message: { tool_calls: {} } }] },
    { choices: [{ message: { tool_calls: [null] } }] },
    {
      choices: [
        {
          message: {
            tool_calls: [
              {
                id: 'x',
                type: 'function',
                function: { name: 'check', arguments: 'bad' },
              },
            ],
          },
        },
      ],
    },
  ])('rejects malformed provider payload %j', async (payload) => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue({ ok: true, json: async () => payload }),
    );
    await expect(
      new OpenAiLlmClient('key', 'model').complete(base),
    ).rejects.toThrow('Malformed');
  });
  it('forwards an abort error without exposing the key', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('aborted')));
    await expect(
      new OpenAiLlmClient('key', 'model').complete(base),
    ).rejects.toThrow('aborted');
  });
});
