import { useCallback, useState } from 'react';
import type { Plan, Scenario, Swap } from '../../api/contracts';
import { reviewPlan } from '../../api/simulation';
import { createCouncilSession } from '../../api/council';
import { DistrictHeatmap } from '../../components/DistrictHeatmap';
import { Failure, Loading } from '../../components/Feedback';
import { number, signed } from '../../components/format';
import { useResource } from '../../hooks/useResource';
import { SubmissionForm } from '../submissions/SubmissionForm';
import { AiReport } from './AiReport';
import { MoveList } from './MoveList';
import { OptimumDialog, SwapDialog } from './ReviewDialog';
import { ScoreHistogram } from './ScoreHistogram';
import { Modal } from '../../components/Modal';
import './review.css';

export function ReviewPage({
  scenario,
  plan,
  onApply,
  onRegistry,
  onCouncil,
  onReplayCouncil,
}: {
  scenario: Scenario;
  plan: Plan;
  onApply: (plan: Plan) => void;
  onRegistry: () => void;
  onCouncil?: (sessionId: string) => void;
  onReplayCouncil?: () => void;
}) {
  const load = useCallback(() => reviewPlan(plan), [plan]);
  const { state, retry } = useResource(load);
  const [swap, setSwap] = useState<Swap | null>(null);
  const [dialog, setDialog] = useState<'optimum' | 'submit' | 'council' | null>(
    null,
  );
  const [launching, setLaunching] = useState(false);
  const [councilError, setCouncilError] = useState('');
  const close = useCallback(() => {
    setSwap(null);
    setDialog(null);
  }, []);
  async function launchCouncil() {
    setLaunching(true);
    setCouncilError('');
    try {
      const id = await createCouncilSession(plan);
      onCouncil?.(id);
      setDialog(null);
    } catch (error) {
      setCouncilError(
        error instanceof Error ? error.message : 'Не удалось начать заседание.',
      );
    } finally {
      setLaunching(false);
    }
  }
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
          <div className="review-actions">
            {onCouncil && (
              <button className="primary" onClick={() => setDialog('council')}>
                вынести на совет →
              </button>
            )}
            <button className="outline" onClick={() => setDialog('submit')}>
              отправить в реестр
            </button>
            {onReplayCouncil && (
              <button className="review-replay" onClick={onReplayCouncil}>
                запись совета ↗
              </button>
            )}
          </div>
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
      {dialog === 'council' && (
        <Modal title="вынести план на совет" onClose={close}>
          <p>
            Семь вымышленных участников обсудят ваш план. Цифры, поправки и
            итоговый пакет проверяются движком.
          </p>
          <p className="muted">
            Во время заседания можно вернуться к разбору. Запись сохранится для
            повторного просмотра.
          </p>
          {councilError && (
            <p role="alert" className="danger">
              {councilError}
            </p>
          )}
          <div className="review-council-actions">
            <button className="outline" onClick={close}>
              отмена
            </button>
            <button
              className="primary"
              disabled={launching}
              onClick={launchCouncil}
            >
              {launching ? 'запускаем…' : 'начать заседание →'}
            </button>
          </div>
        </Modal>
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
