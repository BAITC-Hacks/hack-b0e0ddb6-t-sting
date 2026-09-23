import type {
  Amendment,
  CouncilEvent,
  CouncilMember,
} from '../../../../api/src/council/types';
import type { Scenario } from '../../api/contracts';
import { itemLabel } from '../../components/format';

export function SpeechFeed({
  events,
  members,
  amendments,
  scenario,
}: {
  events: CouncilEvent[];
  members: CouncilMember[];
  amendments: Amendment[];
  scenario: Scenario;
}) {
  const items = events.filter(
    (
      event,
    ): event is Extract<CouncilEvent, { type: 'speech' | 'objection' }> => {
      if (event?.type === 'speech') return true;
      if (event?.type !== 'objection') return false;
      return !events.some(
        (speech) =>
          speech?.type === 'speech' &&
          speech.round === 2 &&
          speech.roleId === event.roleId &&
          speech.text === event.text,
      );
    },
  );
  const amendmentName = (id: string) => {
    const amendment = amendments.find((entry) => entry.id === id);
    return amendment
      ? `${itemLabel(amendment.replace, scenario)} → ${itemLabel(amendment.with, scenario)}`
      : id;
  };
  return (
    <section className="council-panel" aria-label="Лента выступлений">
      <div className="council-section-title">
        <h2># выступления и спор</h2>
        <span>{items.length} реплик</span>
      </div>
      {items.length === 0 ? (
        <p className="muted">Участники готовят выступления…</p>
      ) : (
        <ol className="council-feed">
          {items.map((event, index) => {
            const member = members.find((entry) => entry.id === event.roleId);
            return (
              <li key={index}>
                <div className="council-feed-head">
                  <strong>{member?.title ?? event.roleId}</strong>
                  <span>
                    {event.type === 'objection'
                      ? 'возражение'
                      : `раунд ${event.round} · ${event.source === 'llm' ? 'AI' : 'шаблон'}`}
                  </span>
                </div>
                <p>{event.text}</p>
                {event.type === 'speech' && (
                  <div className="council-feed-meta">
                    <span className={`stance-${event.stance}`}>
                      {event.stance === 'for'
                        ? 'за'
                        : event.stance === 'against'
                          ? 'против'
                          : 'условно'}
                    </span>
                    {event.verified && (
                      <span>✓ цифры подтверждены движком</span>
                    )}
                    {event.amendmentId && (
                      <span>поправка {amendmentName(event.amendmentId)}</span>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </section>
  );
}
