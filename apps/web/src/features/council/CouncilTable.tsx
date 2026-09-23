import type {
  CouncilEvent,
  CouncilMember,
  CouncilRoleId,
  Stance,
  Vote,
} from '../../../../api/src/council/types';

const short: Record<CouncilRoleId | 'chair', string> = {
  transport: 'ТРН',
  ecology: 'ЭКО',
  social: 'СОЦ',
  safety: 'БЕЗ',
  services: 'ХОЗ',
  ombudsman: 'ОМБ',
  finance: 'ФИН',
  chair: 'ПРД',
};
const metric: Record<CouncilRoleId | 'chair', string> = {
  transport: 'T1 T2 · 0.20',
  ecology: 'E1 E2 · 0.20',
  social: 'S1 S2 · 0.22',
  safety: 'B1 B2 · 0.18',
  services: 'C1 C2 · 0.20',
  ombudsman: 'худший район · < 40',
  finance: 'Δ score / 10 ед.',
  chair: 'итоговый score',
};
const stanceLabel: Record<Stance, string> = {
  for: 'за',
  conditional: 'условно',
  against: 'против',
};
const seatPositions = [
  [50, 13],
  [77, 22],
  [87, 49],
  [75, 78],
  [50, 87],
  [23, 78],
  [13, 49],
  [23, 22],
];

export function CouncilTable({
  members,
  events,
}: {
  members: CouncilMember[];
  events: CouncilEvent[];
}) {
  const current = [...events]
    .reverse()
    .find((event) => event?.type === 'speech' || event?.type === 'objection');
  const speaker = current && 'roleId' in current ? current.roleId : null;
  const votes =
    [...events]
      .reverse()
      .find(
        (event): event is Extract<CouncilEvent, { type: 'votes' }> =>
          event?.type === 'votes',
      )?.votes ?? [];
  const speeches = events.filter(
    (event): event is Extract<CouncilEvent, { type: 'speech' }> =>
      event?.type === 'speech',
  );
  return (
    <section className="council-table-panel" aria-label="Состав совета">
      <h2># зал заседания</h2>
      <div
        className="council-ring"
        role="img"
        aria-label="Круглый стол: семь участников и председатель"
      >
        <div className="council-ring-core">
          <span>СОВЕТ</span>
          <small>7 + 1</small>
        </div>
        {members.map((member, index) => (
          <div
            key={member.id}
            className={`council-seat ${speaker === member.id ? 'active' : ''}`}
            style={{
              left: `${seatPositions[index % seatPositions.length][0]}%`,
              top: `${seatPositions[index % seatPositions.length][1]}%`,
            }}
            title={member.title}
          >
            {short[member.id]}
          </div>
        ))}
      </div>
      <div className="council-roster">
        {members.map((member) => {
          const stance = speeches.find(
            (event) => event.roleId === member.id,
          )?.stance;
          const vote = votes.find(
            (entry: Vote) => entry.roleId === member.id,
          )?.vote;
          return (
            <div
              key={member.id}
              className={speaker === member.id ? 'speaking' : ''}
            >
              <strong>{short[member.id]}</strong>
              <span>{member.title}</span>
              <small>
                {vote === 'for'
                  ? '✓ за'
                  : vote === 'against'
                    ? '✕ против'
                    : vote === 'abstain'
                      ? '— воздержался'
                      : stance
                        ? stanceLabel[stance]
                        : metric[member.id]}
              </small>
            </div>
          );
        })}
      </div>
      <p className="council-fiction">
        персонажи вымышленные · только должности
      </p>
    </section>
  );
}
