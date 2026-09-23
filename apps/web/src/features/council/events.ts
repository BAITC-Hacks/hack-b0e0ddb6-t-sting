import type { CouncilEvent } from '../../../../api/src/council/types';

export type CouncilPhase =
  | 'preparation'
  | 'round1'
  | 'amendments'
  | 'round2'
  | 'packages'
  | 'vote'
  | 'protocol'
  | 'failed';

/** SSE IDs are one-based positions in the server's persisted event log. */
export function appendEvent(
  events: CouncilEvent[],
  id: number,
  event: CouncilEvent,
) {
  if (!Number.isSafeInteger(id) || id < 1 || events[id - 1]) return events;
  const next = [...events];
  next[id - 1] = event;
  return next;
}

export function sessionPhase(events: CouncilEvent[]): CouncilPhase {
  if (events.some((event) => event?.type === 'failed')) return 'failed';
  if (
    events.some(
      (event) => event?.type === 'protocol' || event?.type === 'closed',
    )
  )
    return 'protocol';
  if (events.some((event) => event?.type === 'votes')) return 'vote';
  if (events.some((event) => event?.type === 'package-check'))
    return 'packages';
  if (
    events.some(
      (event) =>
        event?.type === 'objection' ||
        (event?.type === 'speech' && event.round === 2),
    )
  )
    return 'round2';
  if (events.some((event) => event?.type === 'amendment')) return 'amendments';
  if (events.some((event) => event?.type === 'opened')) return 'round1';
  return 'preparation';
}
