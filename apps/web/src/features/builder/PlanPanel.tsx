import { useCallback } from 'react';
import type { Plan, Scenario } from '../../api/contracts';
import { validatePlan } from '../../api/simulation';
import { Failure, Loading } from '../../components/Feedback';
import { itemLabel, number } from '../../components/format';
import { useResource } from '../../hooks/useResource';

export function PlanPanel({
  scenario,
  plan,
  onChange,
  onReview,
}: {
  scenario: Scenario;
  plan: Plan;
  onChange: (plan: Plan) => void;
  onReview: () => void;
}) {
  const load = useCallback(() => validatePlan(plan), [plan]);
  const { state, retry } = useResource(load);
  return (
    <section className="plan-panel" aria-label="Текущий план">
      <div className="section-heading">
        <h2># план</h2>
        <span className="muted">{plan.length} / 5</span>
      </div>
      <ol className="plan-list">
        {plan.map((item) => (
          <li key={item.measureId}>
            <span
              title={
                scenario.measures.find((value) => value.id === item.measureId)!
                  .name
              }
            >
              {itemLabel(item, scenario)}
            </span>
            <button
              aria-label={`Удалить ${item.measureId}`}
              onClick={() =>
                onChange(
                  plan.filter((value) => value.measureId !== item.measureId),
                )
              }
            >
              ×
            </button>
          </li>
        ))}
        {Array.from({ length: Math.max(0, 5 - plan.length) }, (_, index) => (
          <li className="empty-slot" key={`empty-${index}`}>
            <span>—</span>
          </li>
        ))}
      </ol>
      {state.status === 'loading' && (
        <Loading>проверяем бюджет и правила</Loading>
      )}
      {state.status === 'error' && (
        <Failure message={state.message} retry={retry} />
      )}
      {state.status === 'success' && (
        <>
          <div className="budget">
            <div>
              <span className="muted">бюджет</span>
              <span>
                {number(state.data.cost)} / {scenario.budget}{' '}
                <span className="muted">
                  · остаток {number(state.data.remaining)}
                </span>
              </span>
            </div>
            <progress
              aria-label="Потраченный бюджет"
              max={scenario.budget}
              value={state.data.cost}
            />
          </div>
          <ul className="rules">
            <li>
              <span className={plan.length === 5 ? 'positive' : 'muted'}>
                {plan.length === 5 ? 'ok' : '··'}
              </span>{' '}
              ровно 5 мер · {plan.length} / 5
            </li>
            <li>
              <span
                className={state.data.remaining >= 0 ? 'positive' : 'danger'}
              >
                {state.data.remaining >= 0 ? 'ok' : '!'}
              </span>{' '}
              бюджет не превышен
            </li>
            <li>
              <span
                className={
                  state.data.violations.some(
                    (value) => value.code === 'DIRECTION_LIMIT',
                  )
                    ? 'danger'
                    : 'positive'
                }
              >
                {state.data.violations.some(
                  (value) => value.code === 'DIRECTION_LIMIT',
                )
                  ? '!'
                  : 'ok'}
              </span>{' '}
              ≤ 2 мер на направление
            </li>
            <li>
              <span
                className={
                  state.data.violations.some(
                    (value) => value.code === 'INCOMPATIBLE',
                  )
                    ? 'danger'
                    : 'positive'
                }
              >
                {state.data.violations.some(
                  (value) => value.code === 'INCOMPATIBLE',
                )
                  ? '!'
                  : 'ok'}
              </span>{' '}
              нет несовместимых мер
            </li>
          </ul>
          <p className="muted direction-count">
            затронуто {state.data.directionsUsed} из 5 направлений
          </p>
          {state.data.violations.length > 0 && (
            <ul className="violation-list" aria-label="Нарушения правил">
              {state.data.violations.map((value, index) => (
                <li key={`${value.code}-${index}`}>{value.message}</li>
              ))}
            </ul>
          )}
        </>
      )}
      <button
        className="primary"
        disabled={
          state.status !== 'success' || state.data.violations.length > 0
        }
        onClick={onReview}
      >
        разобрать партию <span aria-hidden="true">→</span>
      </button>
      <div className="example-actions">
        <button onClick={() => onChange(scenario.examples.strong)}>
          пример плана
        </button>
        <button onClick={() => onChange(scenario.examples.trap)}>
          план-ловушка
        </button>
        <button disabled={plan.length === 0} onClick={() => onChange([])}>
          очистить
        </button>
      </div>
      <details className="scenario-rules">
        <summary>правила сценария</summary>
        <ul>
          {scenario.rules.map((rule) => (
            <li key={rule}>{rule}</li>
          ))}
        </ul>
      </details>
    </section>
  );
}
