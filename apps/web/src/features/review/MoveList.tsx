import type { Review, Scenario, Swap } from '../../api/contracts';
import { itemLabel, signed } from '../../components/format';
const grades = {
  brilliant: ['💎', 'блестящий'],
  best: ['✓', 'лучший'],
  good: ['+', 'хороший'],
  inaccuracy: ['?!', 'неточность'],
  mistake: ['?', 'ошибка'],
  blunder: ['??', 'грубая ошибка'],
};
function SwapOption({
  swap,
  scenario,
  onSwap,
}: {
  swap: Swap;
  scenario: Scenario;
  onSwap: (swap: Swap) => void;
}) {
  return (
    <div className="swap">
      <p>
        {itemLabel(swap.replace, scenario)}
        <br />
        <span className="muted">→ </span>
        {itemLabel(swap.with, scenario)}
      </p>
      <div>
        <span className="positive">{signed(swap.gain)}</span>
        <button
          className="outline"
          aria-label={`Применить замену ${swap.replace.measureId} на ${swap.with.measureId}`}
          onClick={() => onSwap(swap)}
        >
          применить →
        </button>
      </div>
    </div>
  );
}
export function MoveList({
  review,
  scenario,
  onSwap,
}: {
  review: Review;
  scenario: Scenario;
  onSwap: (swap: Swap) => void;
}) {
  const largestContribution = Math.max(
    1,
    ...review.moves.map((move) => Math.abs(move.contribution)),
  );
  return (
    <>
      <section className="moves">
        <h2># вклад мер · Шепли</h2>
        <ul>
          {review.moves.map((move) => (
            <li key={move.item.measureId} className="move-line">
              <span
                className="move-label"
                title={
                  scenario.measures.find(
                    (entry) => entry.id === move.item.measureId,
                  )!.name
                }
              >
                {itemLabel(move.item, scenario)}
              </span>
              <span className="contribution-bar" aria-hidden="true">
                <span
                  style={{
                    width: `${(Math.abs(move.contribution) / largestContribution) * 100}%`,
                  }}
                />
              </span>
              <span className={move.contribution < 0 ? 'danger' : 'positive'}>
                {signed(move.contribution)}
              </span>
              <span className={`grade ${move.grade}`}>
                {grades[move.grade][0]} {grades[move.grade][1]}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section className="swaps">
        <h2># лучшее продолжение</h2>
        {review.topSwaps.length === 0 && (
          <p className="positive">
            Улучшающих замен нет. План оптимален среди одноходовых замен.
          </p>
        )}
        {review.topSwaps.slice(0, 1).map((swap) => (
          <SwapOption
            key={`${swap.replace.measureId}-${swap.with.measureId}-${swap.with.districtId}`}
            swap={swap}
            scenario={scenario}
            onSwap={onSwap}
          />
        ))}
        {review.topSwaps.length > 1 && (
          <details className="additional-swaps">
            <summary>ещё варианты · {review.topSwaps.length - 1}</summary>
            {review.topSwaps.slice(1).map((swap) => (
              <SwapOption
                key={`${swap.replace.measureId}-${swap.with.measureId}-${swap.with.districtId}`}
                swap={swap}
                scenario={scenario}
                onSwap={onSwap}
              />
            ))}
          </details>
        )}
      </section>
    </>
  );
}
