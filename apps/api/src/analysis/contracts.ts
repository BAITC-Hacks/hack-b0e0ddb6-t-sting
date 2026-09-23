import type {
  Analysis,
  Evaluation,
  Plan,
  Review,
  Scenario,
  Validation,
} from '../simulation/engine/types';

export interface ToolTrace {
  tool: string;
  input: unknown;
  output: unknown;
}
export type AnalystReport = Omit<Analysis, 'trace'> & { trace: ToolTrace[] };
export interface AnalysisSimulation {
  scenario(): Scenario;
  review(plan: Plan): Review;
  evaluate(plan: Plan): Evaluation;
  validate(plan: Plan): Validation;
}
export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required: string[];
    additionalProperties: false;
  };
}
export type LlmBlock =
  | { type: 'text'; text: string }
  | { type: 'tool_use'; id: string; name: string; input: unknown }
  | { type: 'tool_result'; tool_use_id: string; content: string };
export interface LlmMessage {
  role: 'user' | 'assistant';
  content: LlmBlock[];
}
export interface LlmRequest {
  system: string;
  messages: LlmMessage[];
  tools: ToolDefinition[];
  signal: AbortSignal;
}
export interface LlmClient {
  complete(request: LlmRequest): Promise<LlmBlock[]>;
}
