import { unsupportedNumbers } from './numeric-facts';
import type { CouncilContext, PackageCheck, Protocol } from './types';

export function checkedProtocol(
  raw: string,
  context: CouncilContext,
  checks: PackageCheck[],
): Protocol {
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object') throw new Error('Invalid protocol');
  const result = value as Record<string, unknown>;
  const ids = result.recommendedAmendmentIds;
  if (!Array.isArray(ids) || !ids.every((id) => typeof id === 'string'))
    throw new Error('Invalid recommendation');
  const check = checks.find(
    (item) =>
      item.valid && JSON.stringify(item.amendmentIds) === JSON.stringify(ids),
  );
  if (
    !check ||
    !check.plan ||
    check.score === undefined ||
    check.cost === undefined
  )
    throw new Error('Unchecked recommendation');
  if (
    !['accept', 'amend', 'revise'].includes(String(result.decision)) ||
    typeof result.summary !== 'string' ||
    !result.summary.trim() ||
    !Array.isArray(result.compromises) ||
    !Array.isArray(result.dissent)
  )
    throw new Error('Invalid protocol');
  const allowed = [
    context.evaluation.score,
    context.evaluation.cost,
    ...context.briefs.flatMap((brief) => brief.allowedNumbers),
    ...context.amendments.flatMap((item) => [
      item.scoreAfter,
      item.delta,
      item.cost,
      ...item.impacts.flatMap((impact) => [
        impact.before,
        impact.after,
        impact.delta,
      ]),
    ]),
    ...checks.flatMap((item) =>
      [item.score, item.cost].filter(
        (number): number is number => number !== undefined,
      ),
    ),
  ];
  if (unsupportedNumbers(result.summary, allowed).length)
    throw new Error('Unsupported number');
  const compromises = result.compromises.map((entry) => {
    if (!entry || typeof entry !== 'object')
      throw new Error('Invalid compromise');
    const item = entry as Record<string, unknown>;
    const alternative = context.amendments.find(
      (amendment) => amendment.id === item.amendmentId,
    );
    const cost = alternative
      ? Number((check.score! - alternative.scoreAfter).toFixed(2))
      : NaN;
    if (
      !alternative ||
      typeof item.scoreCost !== 'number' ||
      Math.abs(item.scoreCost - cost) > 0.01 ||
      typeof item.text !== 'string' ||
      unsupportedNumbers(item.text, allowed.concat(cost)).length
    )
      throw new Error('Invalid compromise');
    return { amendmentId: alternative.id, scoreCost: cost, text: item.text };
  });
  const dissent = result.dissent.map((entry) => {
    if (!entry || typeof entry !== 'object') throw new Error('Invalid dissent');
    const item = entry as Record<string, unknown>;
    const role = context.briefs.find((brief) => brief.roleId === item.roleId);
    if (
      !role ||
      typeof item.text !== 'string' ||
      unsupportedNumbers(item.text, allowed).length
    )
      throw new Error('Invalid dissent');
    return { roleId: role.roleId, text: item.text };
  });
  return {
    decision: result.decision as Protocol['decision'],
    recommendedAmendmentIds: ids,
    plan: check.plan,
    score: check.score,
    cost: check.cost,
    compromises,
    dissent,
    summary: result.summary,
    source: 'llm',
    verified: true,
  };
}
