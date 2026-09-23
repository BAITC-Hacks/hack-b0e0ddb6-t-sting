import type {
  Amendment,
  CouncilMember,
} from '../../../../api/src/council/types';
import type { Scenario } from '../../api/contracts';
import { itemLabel, number, signed } from '../../components/format';

export function AmendmentBoard({
  amendments,
  members,
  scenario,
  recommendedIds,
  onApply,
  onSelect,
}: {
  amendments: Amendment[];
  members: CouncilMember[];
  scenario: Scenario;
  recommendedIds: string[];
  onApply: (amendment: Amendment) => void;
  onSelect: (amendment: Amendment) => void;
}) {
  return (
    <section className="council-panel" aria-label="Поправки">
      <div className="council-section-title">
        <h2># поправки</h2>
        <span>{amendments.length} предложено</span>
      </div>
      {amendments.length === 0 ? (
        <p className="muted">Поправки появятся после выступлений.</p>
      ) : (
        <div className="council-amendments">
          {amendments.map((amendment) => (
            <article key={amendment.id} className="council-amendment">
              <div className="council-amendment-title">
                <strong>
                  {itemLabel(amendment.replace, scenario)} →{' '}
                  {itemLabel(amendment.with, scenario)}
                </strong>
                {recommendedIds.includes(amendment.id) && (
                  <span>рекомендовано</span>
                )}
              </div>
              <div className="council-amendment-stats">
                <span>Score {number(amendment.scoreAfter)}</span>
                <span className={amendment.delta >= 0 ? 'positive' : 'danger'}>
                  {signed(amendment.delta)}
                </span>
                <span>
                  стоимость {number(amendment.cost)} / {scenario.budget}
                </span>
              </div>
              <div
                className="council-impacts"
                aria-label="Влияние на метрики участников"
              >
                {amendment.impacts.map((impact) => (
                  <div
                    key={impact.roleId}
                    title={`${members.find((member) => member.id === impact.roleId)?.title ?? impact.roleId}: ${number(impact.before)} → ${number(impact.after)}`}
                  >
                    <span>
                      {members.find((member) => member.id === impact.roleId)
                        ?.title ?? impact.roleId}
                    </span>
                    <div className="impact-track">
                      <i
                        className={impact.delta < 0 ? 'negative' : 'positive'}
                        style={{
                          width: `${Math.min(100, Math.max(4, Math.abs(impact.delta) * 20))}%`,
                        }}
                      />
                    </div>
                    <b className={impact.delta < 0 ? 'danger' : 'positive'}>
                      {signed(impact.delta)}
                    </b>
                  </div>
                ))}
              </div>
              <div className="council-amendment-actions">
                <button onClick={() => onSelect(amendment)}>
                  показать на карте ↗
                </button>
                <button className="outline" onClick={() => onApply(amendment)}>
                  принять поправку →
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
