import { useState } from 'react';
import type { DistrictId, Evaluation, Plan, Scenario } from '../api/contracts';
import { number } from './format';
import { mapGeometry } from './mapGeometry';

const metrics = ['критические', 'балл D', 'T', 'E', 'S', 'B', 'C'];
export function DistrictHeatmap({
  scenario,
  plan,
  evaluation = scenario.baseline,
  comparison = false,
}: {
  scenario: Scenario;
  plan: Plan;
  evaluation?: Evaluation;
  comparison?: boolean;
}) {
  const [metric, setMetric] = useState('критические');
  const [selected, setSelected] = useState<DistrictId | null>(null);
  const [after, setAfter] = useState(true);
  const view = after ? evaluation : scenario.baseline;
  const district = scenario.districts.find((entry) => entry.id === selected);
  return (
    <section className="map-section" aria-label="Карта районов">
      <div className="section-heading map-heading">
        {comparison ? (
          <div className="tabs" aria-label="Состояние карты">
            {[false, true].map((value) => (
              <button
                key={String(value)}
                aria-pressed={after === value}
                onClick={() => setAfter(value)}
              >
                {value ? 'после' : 'до'}
              </button>
            ))}
          </div>
        ) : (
          <h2># карта · исходное состояние</h2>
        )}
        <div className="tabs metric-tabs" aria-label="Показатель на карте">
          {metrics.map((entry) => (
            <button
              key={entry}
              aria-pressed={metric === entry}
              onClick={() => setMetric(entry)}
            >
              {entry}
            </button>
          ))}
        </div>
      </div>
      <svg
        className="district-map"
        viewBox="0 0 600 440"
        role="group"
        aria-label="Схема районов Астаны"
      >
        {scenario.districts.map((entry) => {
          const shape = mapGeometry[entry.id];
          const result = view.districts.find(
            (value) => value.districtId === entry.id,
          )!;
          const critical = view.criticalCells.filter(
            (value) => value.districtId === entry.id,
          );
          const previousCritical = scenario.baseline.criticalCells.some(
            (value) => value.districtId === entry.id,
          );
          const measures = plan.filter(
            (value) => value.districtId === entry.id,
          );
          const state = critical.length
            ? 'critical'
            : previousCritical
              ? 'improved'
              : 'neutral';
          const mapLabel =
            metric === 'критические'
              ? critical
                  .map((value) => `${value.indicatorId} ${number(value.value)}`)
                  .join(' · ')
              : metric === 'балл D'
                ? `D ${number(result.scoreAfter)}`
                : scenario.indicators
                    .filter((value) => value.id.startsWith(metric))
                    .map(
                      (value) =>
                        `${value.id} ${number(result.after[value.id])}`,
                    )
                    .join(' · ');
          const select = () => setSelected(entry.id);
          return (
            <g
              key={entry.id}
              role="button"
              tabIndex={0}
              aria-label={`Выбрать район ${entry.name}`}
              aria-pressed={selected === entry.id}
              onClick={select}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  select();
                }
              }}
              className={`map-district ${state}`}
            >
              <polygon
                points={shape.points}
                className={selected === entry.id ? 'selected' : ''}
              />
              <text x={shape.x} y={shape.y} className="map-name">
                {entry.name}
              </text>
              <text x={shape.x} y={shape.y + 16} className="map-population">
                {number(entry.population * 100)}%
              </text>
              <text x={shape.x} y={shape.y + 34} className="map-value">
                {mapLabel}
              </text>
              <text x={shape.x} y={shape.y + 51} className="map-measures">
                {measures.map((value) => value.measureId).join(' · ')}
              </text>
            </g>
          );
        })}
        <polyline
          points="0,252 20,250 140,232 250,258 360,240 470,262 580,245 600,244"
          fill="none"
          stroke="#35505C"
          strokeWidth="3"
          pointerEvents="none"
        />
        {plan.some((entry) => !entry.districtId) && (
          <polygon
            className="city-outline"
            points="40,60 230,30 400,50 560,90 580,245 560,360 430,430 300,400 120,420 40,360 20,250"
          />
        )}
        <text x="596" y="436" textAnchor="end" className="map-caption">
          данные условные · границы схематичные
        </text>
      </svg>
      <div className="map-legend muted">
        <span>
          <b className="danger">■</b> есть значения &lt; 40
        </span>
        <span>□ нет</span>
        <span>┄ мера на весь город</span>
      </div>
      <div className="table-scroll">
        <table className="district-summary">
          <thead>
            <tr>
              <th>район</th>
              <th>население</th>
              <th>критические</th>
              <th>меры</th>
            </tr>
          </thead>
          <tbody>
            {scenario.districts.map((entry) => {
              const critical = view.criticalCells.filter(
                (value) => value.districtId === entry.id,
              );
              return (
                <tr key={entry.id}>
                  <th>
                    <button
                      aria-pressed={selected === entry.id}
                      onClick={() => setSelected(entry.id)}
                    >
                      {entry.name}
                    </button>
                  </th>
                  <td>{number(entry.population * 100)}%</td>
                  <td className={critical.length ? 'danger' : 'muted'}>
                    {critical.length}
                    {critical.length > 0 &&
                      ` · ${critical.map((value) => `${value.indicatorId} ${number(value.value)}`).join(', ')}`}
                  </td>
                  <td>
                    {plan
                      .filter((value) => value.districtId === entry.id)
                      .map((value) => value.measureId)
                      .join(', ') || '—'}
                  </td>
                </tr>
              );
            })}
            <tr>
              <th>весь город</th>
              <td>100%</td>
              <td>—</td>
              <td>
                {plan
                  .filter((value) => !value.districtId)
                  .map((value) => value.measureId)
                  .join(', ') || '—'}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      {district && (
        <section className="district-detail">
          <div className="section-heading">
            <h3>{district.name}</h3>
            <button aria-label="Скрыть район" onClick={() => setSelected(null)}>
              ×
            </button>
          </div>
          <p className="muted">{district.profile}</p>
        </section>
      )}
      <details className="indicator-details">
        <summary>
          все показатели · {scenario.districts.length} районов ×{' '}
          {scenario.indicators.length}
        </summary>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>район</th>
                {scenario.indicators.map((entry) => (
                  <th
                    key={entry.id}
                    title={`${entry.name} · вес ${entry.weight}`}
                  >
                    {entry.id}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {view.districts.map((entry) => (
                <tr key={entry.districtId}>
                  <th>
                    {
                      scenario.districts.find(
                        (value) => value.id === entry.districtId,
                      )!.name
                    }
                  </th>
                  {scenario.indicators.map((indicator) => (
                    <td
                      key={indicator.id}
                      className={entry.after[indicator.id] < 40 ? 'danger' : ''}
                    >
                      {comparison && (
                        <span className="muted">
                          {number(entry.before[indicator.id])} →{' '}
                        </span>
                      )}
                      {number(entry.after[indicator.id])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="indicator-key muted">
          {scenario.indicators.map((entry) => (
            <span key={entry.id}>
              {entry.id} — {entry.name}
            </span>
          ))}
        </div>
      </details>
    </section>
  );
}
