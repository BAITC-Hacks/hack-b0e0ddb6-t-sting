import type {
  LlmClient,
  LlmMessage,
  ToolDefinition,
} from '../analysis/contracts';
import { evaluatePackage } from './amendments';
import { checkedProtocol } from './protocol-parser';
import { offlineProtocol } from './offline-council';
import type {
  CouncilContext,
  CouncilEvent,
  PackageCheck,
  Protocol,
} from './types';

const TOOLS: ToolDefinition[] = [
  {
    name: 'evaluate_package',
    description: 'Validate a package and calculate its score with the engine.',
    input_schema: {
      type: 'object',
      properties: {
        amendmentIds: { type: 'array', items: { type: 'string' } },
      },
      required: ['amendmentIds'],
      additionalProperties: false,
    },
  },
  {
    name: 'get_amendment_impacts',
    description: 'Read verified impacts on all seven members.',
    input_schema: {
      type: 'object',
      properties: { amendmentId: { type: 'string' } },
      required: ['amendmentId'],
      additionalProperties: false,
    },
  },
];

function eventFor(
  check: PackageCheck,
): Extract<CouncilEvent, { type: 'package-check' }> {
  return {
    type: 'package-check',
    amendmentIds: check.amendmentIds,
    valid: check.valid,
    ...(check.score === undefined ? {} : { score: check.score }),
    ...(check.cost === undefined ? {} : { cost: check.cost }),
    ...(check.reason ? { reason: check.reason } : {}),
  };
}

function idsOf(value: unknown): string[] | null {
  if (
    !value ||
    typeof value !== 'object' ||
    !('amendmentIds' in value) ||
    !Array.isArray(value.amendmentIds) ||
    !value.amendmentIds.every((id) => typeof id === 'string')
  )
    return null;
  return value.amendmentIds;
}

/** All package attempts are emitted before another model turn or the final protocol. */
export async function chairProtocol(
  context: CouncilContext,
  speeches: CouncilEvent[],
  client: LlmClient | null,
  emit: (event: CouncilEvent) => Promise<void>,
  timeoutMs = 25000,
): Promise<Protocol> {
  const checks: PackageCheck[] = [];
  let emissionError: unknown;
  const checkPackage = async (
    ids: string[],
    inputValid = true,
  ): Promise<PackageCheck> => {
    let check: PackageCheck;
    try {
      check = inputValid
        ? evaluatePackage(context, ids)
        : {
            amendmentIds: ids,
            valid: false,
            reason: 'Неверный формат пакета.',
          };
    } catch {
      check = {
        amendmentIds: ids,
        valid: false,
        reason: 'Движок отклонил пакет.',
      };
    }
    checks.push(check);
    try {
      await emit(eventFor(check));
    } catch (error) {
      emissionError = error;
      throw error;
    }
    return check;
  };
  const fallback = async () => {
    const ranked = [...context.amendments].sort((a, b) => b.delta - a.delta);
    const leader = ranked[0];
    const service = context.amendments.find((item) =>
      context.briefs
        .find((brief) => brief.roleId === 'services')
        ?.candidates.some((candidate) => candidate.id === item.id),
    );
    const safety = context.amendments.find((item) =>
      context.briefs
        .find((brief) => brief.roleId === 'safety')
        ?.candidates.some((candidate) => candidate.id === item.id),
    );
    if (leader && service && leader.id !== service.id)
      await checkPackage([leader.id, service.id]);
    if (safety && service && safety.id !== service.id)
      await checkPackage([safety.id, service.id]);
    const primary = await checkPackage(leader?.delta > 0 ? [leader.id] : []);
    const best =
      checks
        .filter((item) => item.valid && item.score !== undefined)
        .sort((a, b) => b.score! - a.score!)[0] ?? primary;
    return offlineProtocol(context, best);
  };
  if (!client) return fallback();
  const controller = new AbortController();
  let timer!: ReturnType<typeof setTimeout>;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => {
        controller.abort();
        reject(new Error('Chair deadline exceeded'));
      },
      Math.min(Math.max(timeoutMs, 1), 25000),
    );
  });
  const execute = async (): Promise<Protocol> => {
    const messages: LlmMessage[] = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              plan: context.plan,
              score: context.evaluation.score,
              amendments: context.amendments,
              speeches,
            }),
          },
        ],
      },
    ];
    let callsUsed = 0;
    for (let turn = 0; turn < 4; turn += 1) {
      const blocks = await client.complete({
        system:
          'Ты нейтральный председатель вымышленного совета. Не выдумывай числа. Рекомендуй только пакет после evaluate_package с valid true. Можешь запросить get_amendment_impacts. Назови цену компромиссов в баллах. Верни JSON: decision (accept/amend/revise), recommendedAmendmentIds, summary, compromises [{amendmentId,scoreCost,text}], dissent [{roleId,text}].',
        messages,
        tools: TOOLS,
        signal: controller.signal,
      });
      if (controller.signal.aborted) throw new Error('Chair deadline exceeded');
      const calls = blocks.filter((block) => block.type === 'tool_use');
      if (calls.length) {
        if (callsUsed + calls.length > 4)
          throw new Error('Tool budget exceeded');
        callsUsed += calls.length;
        messages.push({ role: 'assistant', content: blocks });
        const results: LlmMessage['content'] = [];
        for (const call of calls) {
          let output: unknown;
          if (call.name === 'evaluate_package') {
            const ids = idsOf(call.input);
            output = await checkPackage(ids ?? [], ids !== null);
          } else if (call.name === 'get_amendment_impacts') {
            const id =
              call.input &&
              typeof call.input === 'object' &&
              'amendmentId' in call.input
                ? call.input.amendmentId
                : null;
            output = context.amendments.find((amendment) => amendment.id === id)
              ?.impacts ?? { error: 'Unknown amendment' };
          } else output = { error: 'Unknown tool' };
          results.push({
            type: 'tool_result',
            tool_use_id: call.id,
            content: JSON.stringify(output),
          });
        }
        messages.push({ role: 'user', content: results });
      } else
        return checkedProtocol(
          blocks
            .filter((block) => block.type === 'text')
            .map((block) => block.text)
            .join(''),
          context,
          checks,
        );
    }
    throw new Error('Chair step limit exceeded');
  };
  try {
    return await Promise.race([execute(), deadline]);
  } catch {
    if (emissionError) throw emissionError;
    return fallback();
  } finally {
    clearTimeout(timer);
  }
}
