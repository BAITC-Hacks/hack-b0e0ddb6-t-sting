import type {
  Amendment,
  CouncilEvent,
  CouncilMember,
} from '../../../../api/src/council/types';
import type { DistrictId, Scenario } from '../../api/contracts';
import { mapGeometry } from '../../components/mapGeometry';

export function CouncilMap({
  scenario,
  amendment,
  objections,
  members,
}: {
  scenario: Scenario;
  amendment: Amendment | null;
  objections: Extract<CouncilEvent, { type: 'objection' }>[];
  members: CouncilMember[];
}) {
  const from = amendment?.replace.districtId;
  const to = amendment?.with.districtId;
  const relevant = amendment
    ? objections.filter((entry) => entry.amendmentId === amendment.id)
    : [];
  const district = (id: DistrictId) =>
    scenario.districts.find((entry) => entry.id === id)?.name ?? id;
  const affected = amendment
    ? [
        ...new Set([
          from ? district(from) : 'весь город',
          to ? district(to) : 'весь город',
        ]),
      ].join(' / ')
    : '';
  return (
    <section
      className="council-panel council-map"
      aria-label="Поправки на карте"
    >
      <div className="council-section-title">
        <h2># поправка на карте</h2>
        <span>районы Астаны</span>
      </div>
      {amendment ? (
        <p>
          {amendment.replace.measureId} {from ? district(from) : 'весь город'} →{' '}
          {amendment.with.measureId} {to ? district(to) : 'весь город'}
        </p>
      ) : (
        <p className="muted">
          Выберите поправку, чтобы увидеть затронутые районы.
        </p>
      )}
      <svg
        viewBox="0 0 600 440"
        role="img"
        aria-label="Схематичная карта затронутых районов"
      >
        {scenario.districts.map((entry) => (
          <g
            key={entry.id}
            className={
              relevant.length &&
              (entry.id === from || entry.id === to || !from || !to)
                ? 'map-contested'
                : entry.id === to
                  ? 'map-target'
                  : entry.id === from
                    ? 'map-source'
                    : ''
            }
          >
            <polygon points={mapGeometry[entry.id].points} />
            <text x={mapGeometry[entry.id].x} y={mapGeometry[entry.id].y}>
              {entry.name}
            </text>
          </g>
        ))}
        {from && to && from !== to && (
          <line
            x1={mapGeometry[from].x + 35}
            y1={mapGeometry[from].y + 8}
            x2={mapGeometry[to].x + 35}
            y2={mapGeometry[to].y + 8}
            markerEnd="url(#council-arrow)"
          />
        )}
        <defs>
          <marker
            id="council-arrow"
            markerWidth="8"
            markerHeight="8"
            refX="6"
            refY="4"
            orient="auto"
          >
            <path d="M0,0 L8,4 L0,8" />
          </marker>
        </defs>
      </svg>
      {relevant.length > 0 && (
        <div
          className="council-map-objections"
          aria-label="Возражения по поправке"
        >
          <strong>! возражение · {affected}</strong>
          {relevant.map((entry, index) => (
            <p key={index}>
              {members.find((member) => member.id === entry.roleId)?.title ??
                entry.roleId}
              : {entry.text}
            </p>
          ))}
        </div>
      )}
      <small>данные условные · границы схематичные</small>
    </section>
  );
}
