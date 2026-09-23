import { parsePlan } from '../simulation/plan-parser';
import type { Plan, Review } from '../simulation/engine/types';
import type { AnalysisSimulation, ToolDefinition } from './contracts';

const planSchema = {
  type: 'array',
  minItems: 5,
  maxItems: 5,
  items: {
    type: 'object',
    properties: {
      measureId: { type: 'string', pattern: '^M([1-9]|1[0-4])$' },
      districtId: {
        type: 'string',
        enum: ['yesil', 'almaty', 'saryarka', 'baikonur', 'nura'],
      },
    },
    required: ['measureId'],
    additionalProperties: false,
  },
};

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  [
    'evaluate_plan',
    'Оценить план: Score, районы, критические ячейки, синергии и правила расчёта.',
  ],
  ['explain_contributions', 'Получить вклады Шепли и оценки ходов.'],
  [
    'get_rank',
    'Получить место среди всех допустимых планов, процентиль, КПД и оптимум.',
  ],
  [
    'find_best_swaps',
    'Найти лучшие допустимые одиночные замены. Рекомендации брать из этого результата.',
  ],
  [
    'evaluate_alternative',
    'Проверить альтернативный допустимый план движком до рекомендации.',
  ],
].map(([name, description]) => ({
  name,
  description,
  input_schema: {
    type: 'object',
    properties: {
      plan: planSchema,
      ...(name === 'find_best_swaps'
        ? { limit: { type: 'integer', minimum: 1, maximum: 5 } }
        : {}),
    },
    required: ['plan'],
    additionalProperties: false,
  },
}));

/** Validates every model-supplied argument before it can reach the engine. */
export class AnalystTools {
  private readonly reviews = new Map<string, Review>();
  constructor(private readonly simulation: AnalysisSimulation) {}

  private review(plan: Plan): Review {
    const key = JSON.stringify(plan);
    let review = this.reviews.get(key);
    if (!review) {
      review = this.simulation.review(plan);
      this.reviews.set(key, review);
    }
    return review;
  }

  call(name: string, input: unknown): unknown {
    if (!TOOL_DEFINITIONS.some((tool) => tool.name === name))
      throw new Error('Unknown tool');
    if (!input || typeof input !== 'object' || Array.isArray(input))
      throw new Error('Invalid tool input');
    const args = input as Record<string, unknown>;
    const allowed = name === 'find_best_swaps' ? ['plan', 'limit'] : ['plan'];
    if (Object.keys(args).some((key) => !allowed.includes(key)))
      throw new Error('Unexpected tool argument');
    const plan = parsePlan({ plan: args.plan });
    if (
      (args.plan as Record<string, unknown>[]).some((item) =>
        Object.keys(item).some(
          (key) => !['measureId', 'districtId'].includes(key),
        ),
      )
    )
      throw new Error('Unexpected plan item field');
    const violations = this.simulation.validate(plan).violations;
    if (violations.length)
      throw new Error(
        violations.map((violation) => violation.message).join('; '),
      );
    if (name === 'evaluate_plan' || name === 'evaluate_alternative') {
      return {
        evaluation: this.simulation.evaluate(plan),
        scenario: this.simulation.scenario(),
        scoring: {
          cityAverageWeight: 70,
          weakestDistrictWeight: 30,
          criticalThreshold: 40,
          criticalCellPenalty: 1,
        },
      };
    }
    const review = this.review(plan);
    if (name === 'explain_contributions')
      return { moves: review.moves, baselineScore: review.baselineScore };
    if (name === 'get_rank')
      return {
        rank: review.rank,
        totalPlans: review.totalPlans,
        percentile: review.percentile,
        efficiency: review.efficiency,
        optimum: review.optimum,
      };
    const limit = args.limit === undefined ? 2 : args.limit;
    if (
      typeof limit !== 'number' ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 5
    )
      throw new Error('Invalid limit');
    return { swaps: review.topSwaps.slice(0, limit) };
  }
}
