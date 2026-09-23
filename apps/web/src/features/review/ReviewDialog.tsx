import type { Review, Scenario, Swap } from '../../api/contracts';
import { Modal } from '../../components/Modal';
import { itemLabel, number, signed } from '../../components/format';
export function SwapDialog({
  swap,
  scenario,
  onClose,
  onConfirm,
}: {
  swap: Swap;
  scenario: Scenario;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal title="Применить замену?" onClose={onClose}>
      <div className="swap-preview">
        <p className="muted">убрать</p>
        <p>{itemLabel(swap.replace, scenario)}</p>
        <p className="muted">добавить</p>
        <p>{itemLabel(swap.with, scenario)}</p>
      </div>
      <p>
        Score после замены: <strong>{number(swap.scoreAfter)}</strong>{' '}
        <span className="positive">{signed(swap.gain)}</span>
      </p>
      <p className="muted">
        План будет пересчитан. Оценки ходов и отчёт аналитика обновятся.
      </p>
      <div className="dialog-actions">
        <button className="outline" onClick={onClose}>
          отмена
        </button>
        <button className="primary" onClick={onConfirm}>
          подтвердить замену →
        </button>
      </div>
    </Modal>
  );
}
export function OptimumDialog({
  review,
  scenario,
  onClose,
}: {
  review: Review;
  scenario: Scenario;
  onClose: () => void;
}) {
  return (
    <Modal title="Оптимальный план" onClose={onClose}>
      <p className="muted">
        Лучший результат среди {number(review.totalPlans)} допустимых планов.
      </p>
      <p className="optimum-score">{number(review.optimum.score)}</p>
      <ol className="optimum-list">
        {review.optimum.plan.map((item) => (
          <li key={item.measureId}>
            <span>{itemLabel(item, scenario)}</span>
            <small>
              {
                scenario.measures.find((entry) => entry.id === item.measureId)!
                  .name
              }
            </small>
          </li>
        ))}
      </ol>
      <p className="muted">
        Потенциал улучшения вашего плана: {signed(review.optimumGap)}.
      </p>
    </Modal>
  );
}
