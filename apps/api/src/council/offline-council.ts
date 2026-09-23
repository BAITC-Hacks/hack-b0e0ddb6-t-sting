import { votesFor } from './votes';
import type {
  CouncilContext,
  Brief,
  CouncilEvent,
  PackageCheck,
  Protocol,
} from './types';

function roundTwoText(brief: Brief, topic?: string): string {
  if (!topic) return `${brief.member.title}: прошу учесть влияние поправки.`;
  const facts = JSON.parse(topic) as {
    instruction: string;
    leader: { delta: number };
    yourImpact?: { before: number; after: number; delta: number };
    objections?: unknown[];
  };
  if (facts.instruction === 'Ответь на возражения')
    return `${brief.member.title}: поправка повышает Score на ${Number(facts.leader.delta.toFixed(2))} балла. Возражения учтём при голосовании.`;
  const impact = facts.yourImpact!;
  return `${brief.member.title}: возражаю — моя метрика снижается с ${Number(impact.before.toFixed(2))} до ${Number(impact.after.toFixed(2))} (${Number(impact.delta.toFixed(2))}).`;
}

export function offlineSpeech(
  brief: Brief,
  round: 1 | 2 = 1,
  topic?: string,
): Extract<CouncilEvent, { type: 'speech' }> {
  const candidate = brief.candidates[0];
  const stance = { for: 'за', conditional: 'условно за', against: 'против' }[
    brief.stance
  ];
  const text =
    round === 1
      ? `${brief.member.title}: я ${stance}. Моя метрика — ${Number(brief.metricAfter.toFixed(2))}. ${candidate ? `Предлагаю заменить ${candidate.replace.measureId} на ${candidate.with.measureId}: прирост Score ${Number(candidate.delta.toFixed(2))}, стоимость ${candidate.cost}.` : 'Поправок, улучшающих мою метрику и общий балл, нет.'}`
      : roundTwoText(brief, topic);
  return {
    type: 'speech',
    round,
    roleId: brief.roleId,
    stance: brief.stance,
    text,
    amendmentId: round === 1 ? (candidate?.id ?? null) : null,
    source: 'offline',
    verified: true,
  };
}

export function offlineProtocol(
  context: CouncilContext,
  check: PackageCheck,
): Protocol {
  const accepted =
    check.valid &&
    check.plan &&
    check.score !== undefined &&
    check.cost !== undefined;
  const ecology = context.amendments.find((item) =>
    context.briefs
      .find((brief) => brief.roleId === 'ecology')
      ?.candidates.some((candidate) => candidate.id === item.id),
  );
  const scoreCost =
    accepted && ecology
      ? Number((check.score! - ecology.scoreAfter).toFixed(2))
      : 0;
  const compromises =
    accepted &&
    ecology &&
    !check.amendmentIds.includes(ecology.id) &&
    scoreCost > 0
      ? [
          {
            amendmentId: ecology.id,
            scoreCost,
            text: `Вариант, улучшающий экологическую метрику, но уступает ${scoreCost} балла Score.`,
          },
        ]
      : [];
  const dissent =
    accepted && check.evaluation
      ? votesFor(context, check.evaluation)
          .filter((vote) => vote.vote === 'against')
          .map((vote) => ({
            roleId: vote.roleId,
            text:
              vote.delta <= -0.1
                ? `Метрика участника снижается на ${Math.abs(Number(vote.delta.toFixed(2)))} балла.`
                : 'В зоне участника появляется новый критический показатель.',
          }))
      : [];
  const finance = context.amendments.find((item) =>
    context.briefs
      .find((brief) => brief.roleId === 'finance')
      ?.candidates.some((candidate) => candidate.id === item.id),
  );
  const savings =
    accepted &&
    finance &&
    finance.cost < check.cost! &&
    finance.scoreAfter <= check.score!;
  return {
    decision: accepted
      ? check.amendmentIds.length
        ? 'amend'
        : 'accept'
      : 'revise',
    recommendedAmendmentIds: accepted ? check.amendmentIds : [],
    plan: accepted ? check.plan! : context.plan,
    score: accepted ? check.score! : context.evaluation.score,
    cost: accepted ? check.cost! : context.evaluation.cost,
    compromises,
    dissent,
    summary: accepted
      ? `${check.amendmentIds.length ? 'Рекомендована проверенная движком поправка.' : 'Исходный план подтверждён движком.'}${savings ? ' Экономия бюджета сама по себе не даёт баллов Score.' : ''}`
      : 'Пакет поправок не подтверждён движком; план требует доработки.',
    source: 'offline',
    verified: true,
  };
}
