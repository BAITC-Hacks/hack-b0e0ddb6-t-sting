import type {
  Amendment,
  CouncilEvent,
  CouncilMember,
  Protocol,
  Vote,
} from '../../../../api/src/council/types';
import type { Scenario } from '../../api/contracts';
import { itemLabel, number } from '../../components/format';

const decision = {
  accept: 'принять план',
  amend: 'принять с поправками',
  revise: 'доработать',
};
export function ProtocolPanel({
  events,
  members,
  amendments,
  scenario,
  onApply,
}: {
  events: CouncilEvent[];
  members: CouncilMember[];
  amendments: Amendment[];
  scenario: Scenario;
  onApply: (plan: Protocol['plan']) => void;
}) {
  const checks = events.filter(
    (event): event is Extract<CouncilEvent, { type: 'package-check' }> =>
      event?.type === 'package-check',
  );
  const votes = events.find(
    (event): event is Extract<CouncilEvent, { type: 'votes' }> =>
      event?.type === 'votes',
  )?.votes;
  const protocol = events.find(
    (event): event is Extract<CouncilEvent, { type: 'protocol' }> =>
      event?.type === 'protocol',
  )?.protocol;
  const validRecommendation =
    protocol &&
    protocol.verified &&
    checks.some(
      (check) =>
        check.valid &&
        check.amendmentIds.length === protocol.recommendedAmendmentIds.length &&
        check.amendmentIds.every((id) =>
          protocol.recommendedAmendmentIds.includes(id),
        ),
    );
  const amendmentName = (id: string) => {
    const amendment = amendments.find((entry) => entry.id === id);
    return amendment
      ? `${itemLabel(amendment.replace, scenario)} → ${itemLabel(amendment.with, scenario)}`
      : id;
  };
  return (
    <div className="council-protocol-stack">
      <section className="council-panel" aria-label="Проверка пакетов">
        <div className="council-section-title">
          <h2># проверка пакетов движком</h2>
          <span>{checks.length} попыток</span>
        </div>
        {checks.length ? (
          <ol className="council-checks">
            {checks.map((check, index) => (
              <li key={index}>
                <span className={check.valid ? 'positive' : 'danger'}>
                  {check.valid ? '✓ принято' : '✕ отклонено'}
                </span>
                <span>
                  {check.amendmentIds.map(amendmentName).join(' + ') ||
                    'исходный план'}
                </span>
                <span>
                  {check.valid
                    ? `Score ${check.score === undefined ? '—' : number(check.score)} · стоимость ${check.cost === undefined ? '—' : number(check.cost)}`
                    : `${check.reason ?? 'Пакет не прошёл проверку'}${check.cost === undefined ? '' : ` · стоимость ${number(check.cost)} / ${scenario.budget}`}`}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="muted">Председатель ещё не проверял пакет.</p>
        )}
      </section>
      {votes && (
        <section className="council-panel" aria-label="Голосование">
          <div className="council-section-title">
            <h2># голосование</h2>
            <span>
              {votes.filter((vote: Vote) => vote.vote === 'for').length} за /{' '}
              {votes.filter((vote: Vote) => vote.vote === 'abstain').length}{' '}
              воздержались /{' '}
              {votes.filter((vote: Vote) => vote.vote === 'against').length}{' '}
              против
            </span>
          </div>
          <ul className="council-votes">
            {votes.map((vote: Vote) => (
              <li key={vote.roleId}>
                <span>
                  {members.find((member) => member.id === vote.roleId)?.title ??
                    vote.roleId}
                </span>
                <span
                  className={
                    vote.vote === 'against'
                      ? 'danger'
                      : vote.vote === 'for'
                        ? 'positive'
                        : 'muted'
                  }
                >
                  {vote.vote === 'for'
                    ? 'за'
                    : vote.vote === 'against'
                      ? 'против'
                      : 'воздержался'}{' '}
                  · {vote.delta > 0 ? '+' : ''}
                  {vote.delta.toLocaleString('ru-RU', {
                    maximumFractionDigits: 3,
                  })}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
      {protocol && (
        <section
          className="council-panel council-protocol"
          aria-label="Протокол заседания"
        >
          <div className="council-section-title">
            <h2># протокол председателя</h2>
            <span>
              {protocol.source === 'llm' ? 'AI' : 'шаблон'} ·{' '}
              {protocol.verified ? 'проверено движком' : 'ожидает проверки'}
            </span>
          </div>
          <strong>{decision[protocol.decision]}</strong>
          <p>{protocol.summary}</p>
          <div className="council-protocol-score">
            <span>Score {number(protocol.score)}</span>
            <span>
              стоимость {number(protocol.cost)} / {scenario.budget}
            </span>
          </div>
          {protocol.compromises.length > 0 && (
            <div>
              <h3>компромиссы</h3>
              <ul>
                {protocol.compromises.map((entry, index) => (
                  <li key={index}>
                    {entry.text} · цена {number(entry.scoreCost)} балла
                  </li>
                ))}
              </ul>
            </div>
          )}
          {protocol.dissent.length > 0 && (
            <div>
              <h3>особые мнения</h3>
              <ul>
                {protocol.dissent.map((entry, index) => (
                  <li key={index}>
                    {members.find((member) => member.id === entry.roleId)
                      ?.title ?? entry.roleId}
                    : {entry.text}
                  </li>
                ))}
              </ul>
            </div>
          )}
          {protocol.recommendedAmendmentIds.length > 0 && (
            <p className="muted">
              Пакет:{' '}
              {protocol.plan
                .map((item) => itemLabel(item, scenario))
                .join(' · ')}
            </p>
          )}
          {validRecommendation && (
            <button className="primary" onClick={() => onApply(protocol.plan)}>
              принять пакет →
            </button>
          )}
        </section>
      )}
    </div>
  );
}
