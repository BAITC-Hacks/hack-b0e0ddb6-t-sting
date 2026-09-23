import Anthropic from '@anthropic-ai/sdk';
import type { LlmBlock, LlmClient, LlmRequest } from './contracts';

/** The provider SDK is isolated here so the analyst can use deterministic test clients. */
export class AnthropicLlmClient implements LlmClient {
  private readonly sdk: Anthropic;

  constructor(
    apiKey: string,
    private readonly model: string,
  ) {
    this.sdk = new Anthropic({ apiKey, maxRetries: 0 });
  }

  async complete(request: LlmRequest): Promise<LlmBlock[]> {
    const response = await this.sdk.messages.create(
      {
        model: this.model,
        max_tokens: 3500,
        system: request.system,
        messages: request.messages,
        tools: request.tools,
      },
      { signal: request.signal },
    );
    return response.content.flatMap((block): LlmBlock[] => {
      if (block.type === 'text') return [{ type: 'text', text: block.text }];
      if (block.type === 'tool_use')
        return [
          {
            type: 'tool_use',
            id: block.id,
            name: block.name,
            input: block.input,
          },
        ];
      return [];
    });
  }
}
