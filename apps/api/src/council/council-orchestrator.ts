import type { LlmClient } from '../analysis/contracts';
import { OpenAiLlmClient } from '../analysis/llm-client';
import type { Plan } from '../simulation/engine/types';
import { prepareCouncil } from './briefs';
import { votesFor } from './votes';
import { evaluatePackage } from './amendments';
import { chairProtocol } from './chair-agent';
import { deputySpeech } from './deputy-agent';
import { offlineSpeech } from './offline-council';
import type { CouncilEvent } from './types';

export interface CouncilClients {
  deputy: LlmClient | null;
  chair: LlmClient | null;
  timeoutMs: number;
}
export type CouncilEmit = (event: CouncilEvent) => Promise<void>;

/** Engine preparation and votes remain deterministic; language calls can fail independently. */
export async function runCouncil(
  plan: Plan,
  clients: CouncilClients,
  emit: CouncilEmit,
): Promise<void> {
  const context = prepareCouncil(plan);
  await emit({
    type: 'opened',
    plan,
    score: context.evaluation.score,
    members: context.members,
  });
  const speeches: CouncilEvent[] = [];
  let emission = Promise.resolve();
  const publish = (event: CouncilEvent) => {
    emission = emission.then(() => emit(event));
    return emission;
  };
  const first = await Promise.allSettled(
    context.briefs.map(async (brief) => {
      const speech = await deputySpeech(
        brief,
        clients.deputy,
        clients.timeoutMs,
      );
      await publish(speech);
      return speech;
    }),
  );
  await emission;
  for (const [index, result] of first.entries()) {
    if (result.status === 'fulfilled') speeches.push(result.value);
    else {
      const speech = offlineSpeech(context.briefs[index]);
      speeches.push(speech);
      await emit(speech);
    }
  }
  const selectedIds = new Set(
    speeches
      .filter(
        (item): item is Extract<CouncilEvent, { type: 'speech' }> =>
          item.type === 'speech',
      )
      .map((item) => item.amendmentId)
      .filter((id): id is string => id !== null),
  );
  context.amendments = context.amendments.filter((item) =>
    selectedIds.has(item.id),
  );
  for (const amendment of context.amendments)
    await emit({ type: 'amendment', amendment });
  const leader = [...context.amendments].sort((a, b) => b.delta - a.delta)[0];
  if (leader) {
    const opponents = leader.impacts
      .filter((impact) => impact.delta <= -0.1)
      .sort((a, b) => a.delta - b.delta)
      .slice(0, 2);
    const replies = await Promise.allSettled(
      opponents.map((impact) =>
        deputySpeech(
          context.briefs.find((brief) => brief.roleId === impact.roleId)!,
          clients.deputy,
          clients.timeoutMs,
          2,
          JSON.stringify({
            instruction: 'Возрази на поправку',
            leader: {
              id: leader.id,
              scoreAfter: leader.scoreAfter,
              delta: leader.delta,
              impacts: leader.impacts,
            },
            yourImpact: impact,
          }),
        ),
      ),
    );
    for (const [index, result] of replies.entries()) {
      const brief = context.briefs.find(
        (item) => item.roleId === opponents[index].roleId,
      )!;
      const speech =
        result.status === 'fulfilled' ? result.value : offlineSpeech(brief, 2);
      speeches.push(speech);
      await emit(speech);
      await emit({
        type: 'objection',
        roleId: brief.roleId,
        amendmentId: leader.id,
        text: speech.text,
      });
    }
    if (opponents.length) {
      const proposer = speeches.find(
        (item) =>
          item.type === 'speech' &&
          item.round === 1 &&
          item.amendmentId === leader.id,
      ) as Extract<CouncilEvent, { type: 'speech' }>;
      const author = context.briefs.find(
        (brief) => brief.roleId === proposer.roleId,
      )!;
      const speech = await deputySpeech(
        author,
        clients.deputy,
        clients.timeoutMs,
        2,
        JSON.stringify({
          instruction: 'Ответь на возражения',
          leader: {
            id: leader.id,
            scoreAfter: leader.scoreAfter,
            delta: leader.delta,
            impacts: leader.impacts,
          },
          objections: speeches.filter(
            (item) => item.type === 'speech' && item.round === 2,
          ),
        }),
      );
      speeches.push(speech);
      await emit(speech);
    }
  }
  const protocol = await chairProtocol(context, speeches, clients.chair, emit);
  const checked = evaluatePackage(context, protocol.recommendedAmendmentIds);
  if (!checked.valid || !checked.evaluation)
    throw new Error('Chair recommendation failed final validation');
  await emit({ type: 'votes', votes: votesFor(context, checked.evaluation) });
  await emit({ type: 'protocol', protocol });
  await emit({ type: 'closed' });
}

/** Empty keys select a complete, deterministic offline session. */
export function createCouncilRunner(
  env: NodeJS.ProcessEnv = process.env,
): (plan: Plan, emit: CouncilEmit) => Promise<void> {
  const key = env.OPENAI_API_KEY?.trim();
  const primaryModel = env.AI_MODEL?.trim() || 'gpt-4.1-mini';
  const deputyModel = env.AI_COUNCIL_MODEL?.trim() || primaryModel;
  const configured = Number(env.AI_COUNCIL_TIMEOUT_MS);
  const timeoutMs =
    Number.isFinite(configured) && configured > 0
      ? Math.min(configured, 12000)
      : 12000;
  const clients: CouncilClients = {
    deputy: key ? new OpenAiLlmClient(key, deputyModel) : null,
    chair: key ? new OpenAiLlmClient(key, primaryModel) : null,
    timeoutMs,
  };
  return (plan, emit) => runCouncil(plan, clients, emit);
}
