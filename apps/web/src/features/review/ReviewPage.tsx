import { useCallback, useState } from 'react';
import type { Plan, Scenario, Swap } from '../../api/contracts';
import { reviewPlan } from '../../api/simulation';
import { DistrictHeatmap } from '../../components/DistrictHeatmap';
import { Failure, Loading } from '../../components/Feedback';
import { number, signed } from '../../components/format';
import { useResource } from '../../hooks/useResource';
import { SubmissionForm } from '../submissions/SubmissionForm';
import { AiReport } from './AiReport';
import { MoveList } from './MoveList';
import { OptimumDialog, SwapDialog } from './ReviewDialog';
import { ScoreHistogram } from './ScoreHistogram';
import './review.css';

export function ReviewPage({
  scenario,
  plan,
  onApply,
  onRegistry,
}: {
  scenario: Scenario;
  plan: Plan;
  onApply: (plan: Plan) => void;
  onRegistry: () => void;
}) {
  const load = useCallback(() => reviewPlan(plan), [plan]);
  const { state, retry } = useResource(load);
  const [swap, setSwap] = useState<Swap | null>(null);
  const [dialog, setDialog] = useState<'optimum' | 'submit' | null>(null);
  const close = useCallback(() => {
    setSwap(null);
    setDialog(null);
  }, []);
  return (
    <div className="review-page">
      {state.status === 'success' && (
        <section className="score-summary" aria-label="Результат плана">
          <div>
            <h1>score</h1>
            <div className="score-number">
              {number(state.data.evaluation.score)}
            </div>
            <p>
              <span
                className={state.data.scoreDelta >= 0 ? 'positive' : 'danger'}
              >
                {signed(state.data.scoreDelta)}
              </span>{' '}
              <span className="muted">
                от базы {number(state.data.baselineScore)}
              </span>
            </p>
          </div>
          <dl className="score-metrics">
            <div>
              <dt>ранг</dt>
              <dd>
                {number(state.data.rank)} / {number(state.data.totalPlans)}
              </dd>
            </div>
            <div>
              <dt>лучше планов</dt>
              <dd>{number(state.data.percentile)}%</dd>
            </div>
            <div>
              <dt>кпд</dt>
              <dd>{number(state.data.efficiency)}%</dd>
            </div>
            <div>
              <dt>бюджет</dt>
              <dd>
                {number(state.data.evaluation.cost)} / {scenario.budget}
              </dd>
            </div>
          </dl>
          <button className="outline" onClick={() => setDialog('submit')}>
            отправить в реестр
          </button>
        </section>
      )}
      <div className="workspace-grid">
        <div>
          {state.status === 'loading' && (
            <Loading>движок разбирает партию…</Loading>
          )}
          {state.status === 'error' && (
            <Failure message={state.message} retry={retry} />
          )}
          {state.status === 'success' && (
            <>
              <DistrictHeatmap
                scenario={scenario}
                plan={plan}
                evaluation={state.data.evaluation}
                comparison
              />
              <ScoreHistogram review={state.data} />
            </>
          )}
        </div>
        <aside className="review-sidebar">
          {state.status === 'success' && (
            <>
              <MoveList
                review={state.data}
                scenario={scenario}
                onSwap={setSwap}
              />
              <button
                className="optimum-button"
                onClick={() => setDialog('optimum')}
              >
                показать оптимум <span className="muted">[спойлер]</span>
              </button>
            </>
          )}
          <AiReport plan={plan} />
          {state.status === 'success' && (
            <details className="review-context muted">
              <summary>подробнее о результате</summary>
              <p>
                Средний балл города: {number(state.data.evaluation.cityAverage)}
              </p>
              <p>Худший район: {number(state.data.evaluation.weakestScore)}</p>
              <p>
                Критических значений:{' '}
                {state.data.evaluation.criticalCells.length}
              </p>
              <p>Синергий: {state.data.evaluation.synergies.length}</p>
            </details>
          )}
        </aside>
      </div>
      {state.status === 'success' && dialog === 'optimum' && (
        <OptimumDialog
          review={state.data}
          scenario={scenario}
          onClose={close}
        />
      )}
      {dialog === 'submit' && (
        <SubmissionForm plan={plan} onClose={close} onRegistry={onRegistry} />
      )}
      {swap && (
        <SwapDialog
          swap={swap}
          scenario={scenario}
          onClose={close}
          onConfirm={() => {
            onApply(
              plan.map((item) =>
                item.measureId === swap.replace.measureId ? swap.with : item,
              ),
            );
            close();
          }}
        />
      )}
    </div>
  );
}
