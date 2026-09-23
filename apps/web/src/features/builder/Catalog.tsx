import { useCallback, useState } from 'react';
import type { Measure, Plan, PlanItem, Scenario } from '../../api/contracts';
import { directions } from '../../components/format';
import { MeasureDialog } from './MeasureDialog';

export function Catalog({
  scenario,
  plan,
  onAdd,
}: {
  scenario: Scenario;
  plan: Plan;
  onAdd: (item: PlanItem) => void;
}) {
  const [query, setQuery] = useState('');
  const [direction, setDirection] = useState('all');
  const [measure, setMeasure] = useState<Measure | null>(null);
  const close = useCallback(() => setMeasure(null), []);
  const visible = scenario.measures.filter(
    (entry) =>
      (direction === 'all' || entry.direction === direction) &&
      `${entry.id} ${entry.name}`
        .toLocaleLowerCase('ru')
        .includes(query.toLocaleLowerCase('ru')),
  );
  return (
    <section className="catalog" aria-label="Каталог мер">
      <div className="section-heading">
        <h2># меры</h2>
        <span className="muted">1 · мера / 2 · район</span>
      </div>
      <div className="catalog-filters">
        <input
          aria-label="Поиск мер"
          placeholder="найти меру…"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select
          aria-label="Направление"
          value={direction}
          onChange={(event) => setDirection(event.target.value)}
        >
          <option value="all">все направления</option>
          {Object.entries(directions).map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
      </div>
      {Object.entries(directions).map(([id, name]) => {
        const measures = visible.filter((entry) => entry.direction === id);
        return (
          measures.length > 0 && (
            <section className="catalog-group" key={id}>
              <h3>{name}</h3>
              {measures.map((entry) => {
                const chosen = plan.some((item) => item.measureId === entry.id);
                return (
                  <button
                    key={entry.id}
                    disabled={chosen || plan.length >= 5}
                    className="measure-row"
                    onClick={() => setMeasure(entry)}
                    aria-label={`${entry.id} ${entry.name}`}
                  >
                    <span aria-hidden="true">{chosen ? '■' : '□'}</span>
                    <span className="measure-id">{entry.id}</span>
                    <span className="measure-name">
                      {entry.name}
                      <small>
                        {entry.scope === 'city' ? 'город' : 'район'} · лаг{' '}
                        {entry.lag}
                      </small>
                    </span>
                    <span>{entry.cost}</span>
                  </button>
                );
              })}
            </section>
          )
        );
      })}
      {visible.length === 0 && (
        <p className="muted">
          Меры не найдены. Измените поиск или направление.
        </p>
      )}
      {measure && (
        <MeasureDialog
          measure={measure}
          scenario={scenario}
          onClose={close}
          onAdd={(item) => {
            onAdd(item);
            close();
          }}
        />
      )}
    </section>
  );
}
