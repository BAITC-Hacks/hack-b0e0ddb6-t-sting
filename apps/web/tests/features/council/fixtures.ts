import type {
  CouncilEvent,
  CouncilSession,
} from '../../../../api/src/council/types';
import { scenario } from '../../fixtures/scenario';

export const plan = scenario.examples.strong;
export const members = [
  {
    id: 'ecology' as const,
    title: 'Заместитель по экологии',
    emoji: '🌳',
    metric: 'экология',
    character: 'строгий',
  },
  {
    id: 'chair' as const,
    title: 'Председатель совета',
    emoji: '⚖️',
    metric: 'Score',
    character: 'нейтральный',
  },
];
export const amendment = {
  id: 'a1',
  replace: plan[4],
  with: { measureId: 'M3' as const, districtId: 'nura' as const },
  plan: [
    ...plan.slice(0, 4),
    { measureId: 'M3' as const, districtId: 'nura' as const },
  ],
  scoreAfter: 57.21,
  delta: 0.66,
  cost: 100,
  impacts: [
    { roleId: 'ecology' as const, before: 9.1, after: 8.94, delta: -0.16 },
  ],
};
export const opened: CouncilEvent = {
  type: 'opened',
  plan,
  score: 56.54,
  members,
};
export const speech: Extract<CouncilEvent, { type: 'speech' }> = {
  type: 'speech',
  round: 1,
  roleId: 'ecology',
  stance: 'against',
  text: 'Экология возражает.',
  amendmentId: 'a1',
  source: 'offline',
  verified: true,
};
export const events: CouncilEvent[] = [
  opened,
  speech,
  { type: 'amendment', amendment },
];
export const snapshot = (
  items: CouncilEvent[] = events,
  status: CouncilSession['status'] = 'closed',
): CouncilSession => ({
  id: 'session-1',
  plan,
  events: items,
  protocol: null,
  status,
  createdAt: '2026-09-23',
});
