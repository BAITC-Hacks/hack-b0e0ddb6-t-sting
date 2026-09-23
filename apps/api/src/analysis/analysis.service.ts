import type { Plan } from '../simulation/engine/types';
import type { AnalysisSimulation, LlmClient } from './contracts';
import { runAnalyst } from './analyst-agent';
import { OpenAiLlmClient } from './llm-client';

export class AnalysisService {
  constructor(
    private readonly simulation: AnalysisSimulation,
    private readonly client: LlmClient | null,
    private readonly timeoutMs = 25000,
  ) {}

  async analyze(plan: Plan) {
    const review = this.simulation.review(plan);
    return runAnalyst(
      plan,
      review,
      this.simulation.scenario(),
      this.simulation,
      this.client,
      this.timeoutMs,
    );
  }
}

/** Empty keys keep local setup fully functional; invalid timeout settings stay bounded. */
export function createAnalysisService(
  simulation: AnalysisSimulation,
  env: NodeJS.ProcessEnv = process.env,
): AnalysisService {
  const key = env.OPENAI_API_KEY?.trim();
  const model = env.AI_MODEL?.trim() || 'gpt-4.1-mini';
  const configured = Number(env.AI_TIMEOUT_MS);
  const timeout =
    Number.isFinite(configured) && configured > 0
      ? Math.min(configured, 25000)
      : 25000;
  return new AnalysisService(
    simulation,
    key ? new OpenAiLlmClient(key, model) : null,
    timeout,
  );
}
