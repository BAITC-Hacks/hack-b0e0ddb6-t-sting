import type { LlmBlock, LlmClient, LlmMessage, LlmRequest } from './contracts';

type ChatMessage = Record<string, unknown>;

function translateMessages(messages: LlmMessage[]): ChatMessage[] {
  const translated: ChatMessage[] = [];
  for (const message of messages) {
    const content = message.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('\n');
    const calls = message.content
      .filter((block) => block.type === 'tool_use')
      .map((block) => ({
        id: block.id,
        type: 'function',
        function: { name: block.name, arguments: JSON.stringify(block.input) },
      }));
    if (content || calls.length)
      translated.push({
        role: message.role,
        content: content || null,
        ...(calls.length ? { tool_calls: calls } : {}),
      });
    for (const result of message.content.filter(
      (block) => block.type === 'tool_result',
    ))
      translated.push({
        role: 'tool',
        tool_call_id: result.tool_use_id,
        content: result.content,
      });
  }
  return translated;
}

/** Maps the provider's Chat Completions envelope to the analyst's neutral blocks. */
export class OpenAiLlmClient implements LlmClient {
  constructor(
    private readonly apiKey: string,
    private readonly model: string,
  ) {}

  async complete(request: LlmRequest): Promise<LlmBlock[]> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        max_completion_tokens: 3500,
        messages: [
          { role: 'system', content: request.system },
          ...translateMessages(request.messages),
        ],
        ...(request.tools.length
          ? {
              tools: request.tools.map((tool) => ({
                type: 'function',
                function: {
                  name: tool.name,
                  description: tool.description,
                  parameters: tool.input_schema,
                },
              })),
            }
          : {}),
      }),
      signal: request.signal,
    });
    if (!response.ok)
      throw new Error(`OpenAI request failed: ${response.status}`);
    const data: unknown = await response.json();
    if (
      !data ||
      typeof data !== 'object' ||
      !('choices' in data) ||
      !Array.isArray(data.choices)
    )
      throw new Error('Malformed OpenAI response');
    const message: unknown = data.choices[0]?.message;
    if (!message || typeof message !== 'object')
      throw new Error('Malformed OpenAI response');
    const value = message as { content?: unknown; tool_calls?: unknown };
    const blocks: LlmBlock[] = [];
    if (typeof value.content === 'string' && value.content)
      blocks.push({ type: 'text', text: value.content });
    if (value.tool_calls !== undefined && !Array.isArray(value.tool_calls))
      throw new Error('Malformed OpenAI response');
    for (const raw of value.tool_calls ?? []) {
      if (
        !raw ||
        typeof raw.id !== 'string' ||
        raw.type !== 'function' ||
        typeof raw.function?.name !== 'string' ||
        typeof raw.function?.arguments !== 'string'
      )
        throw new Error('Malformed OpenAI response');
      let input: unknown;
      try {
        input = JSON.parse(raw.function.arguments);
      } catch {
        throw new Error('Malformed OpenAI response');
      }
      blocks.push({
        type: 'tool_use',
        id: raw.id,
        name: raw.function.name,
        input,
      });
    }
    if (!blocks.length) throw new Error('Malformed OpenAI response');
    return blocks;
  }
}
