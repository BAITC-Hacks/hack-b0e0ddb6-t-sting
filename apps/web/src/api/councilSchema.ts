import { matches, type Schema } from './schema';
import type { CouncilEvent } from '../../../api/src/council/types';

const role = {
  values: [
    'transport',
    'ecology',
    'social',
    'safety',
    'services',
    'ombudsman',
    'finance',
  ],
};
const memberId = { values: [...role.values, 'chair'] };
const district = {
  values: ['yesil', 'almaty', 'saryarka', 'baikonur', 'nura'],
};
const measure = {
  values: Array.from({ length: 14 }, (_, index) => `M${index + 1}`),
};
const item: Schema = {
  fields: { measureId: measure, districtId: { optional: district } },
};
export const planSchema: Schema = { array: item };
const member: Schema = {
  fields: {
    id: memberId,
    title: 'string',
    emoji: 'string',
    metric: 'string',
    character: 'string',
  },
};
const impact: Schema = {
  fields: { roleId: role, before: 'number', after: 'number', delta: 'number' },
};
const amendmentSchema: Schema = {
  fields: {
    id: 'string',
    replace: item,
    with: item,
    plan: planSchema,
    scoreAfter: 'number',
    delta: 'number',
    cost: 'number',
    impacts: { array: impact },
  },
};
export const protocolSchema: Schema = {
  fields: {
    source: { values: ['llm', 'offline'] },
    verified: 'boolean',
    decision: { values: ['accept', 'amend', 'revise'] },
    recommendedAmendmentIds: { array: 'string' },
    plan: planSchema,
    score: 'number',
    cost: 'number',
    compromises: {
      array: {
        fields: { amendmentId: 'string', scoreCost: 'number', text: 'string' },
      },
    },
    dissent: { array: { fields: { roleId: role, text: 'string' } } },
    summary: 'string',
  },
};
const vote: Schema = {
  fields: {
    roleId: role,
    vote: { values: ['for', 'abstain', 'against'] },
    delta: 'number',
  },
};
const byType: Record<CouncilEvent['type'], Schema> = {
  opened: {
    fields: {
      type: { values: ['opened'] },
      plan: planSchema,
      score: 'number',
      members: { array: member },
    },
  },
  speech: {
    fields: {
      type: { values: ['speech'] },
      round: { values: [1, 2] },
      roleId: role,
      stance: { values: ['for', 'conditional', 'against'] },
      text: 'string',
      amendmentId: 'unknown',
      source: { values: ['llm', 'offline'] },
      verified: 'boolean',
    },
  },
  amendment: {
    fields: { type: { values: ['amendment'] }, amendment: amendmentSchema },
  },
  objection: {
    fields: {
      type: { values: ['objection'] },
      roleId: role,
      amendmentId: 'string',
      text: 'string',
    },
  },
  'package-check': {
    fields: {
      type: { values: ['package-check'] },
      amendmentIds: { array: 'string' },
      valid: 'boolean',
      score: { optional: 'number' },
      cost: { optional: 'number' },
      reason: { optional: 'string' },
    },
  },
  votes: { fields: { type: { values: ['votes'] }, votes: { array: vote } } },
  protocol: {
    fields: { type: { values: ['protocol'] }, protocol: protocolSchema },
  },
  closed: { fields: { type: { values: ['closed'] } } },
  failed: { fields: { type: { values: ['failed'] }, message: 'string' } },
};

/** Check every field the UI reads before trusting network or storage data. */
export function isCouncilEvent(value: unknown): value is CouncilEvent {
  if (
    !value ||
    typeof value !== 'object' ||
    !('type' in value) ||
    typeof value.type !== 'string'
  )
    return false;
  const schema = byType[value.type as CouncilEvent['type']];
  if (!schema || !matches(value, schema)) return false;
  if (value.type === 'speech')
    return (
      (value as Record<string, unknown>).amendmentId === null ||
      typeof (value as Record<string, unknown>).amendmentId === 'string'
    );
  return true;
}

export function isPlan(value: unknown): boolean {
  return matches(value, planSchema);
}
export function isProtocol(value: unknown): boolean {
  return matches(value, protocolSchema);
}
