import { useState } from 'react';
import type {
  DistrictId,
  Measure,
  PlanItem,
  Scenario,
} from '../../api/contracts';
import { Modal } from '../../components/Modal';
import { directions, signed } from '../../components/format';

export function MeasureDialog({
  measure,
  scenario,
  onAdd,
  onClose,
}: {
  measure: Measure;
  scenario: Scenario;
  onAdd: (item: PlanItem) => void;
  onClose: () => void;
}) {
  const [districtId, setDistrict] = useState<DistrictId | undefined>();
  return (
    <Modal title={`${measure.id} · ${measure.name}`} onClose={onClose}>
      <p className="muted">
        {directions[measure.direction]} ·{' '}
        {measure.scope === 'city' ? 'весь город' : 'районная мера'}
      </p>
      <dl className="measure-facts">
        <div>
          <dt>стоимость</dt>
          <dd>{measure.cost}</dd>
        </div>
        <div>
          <dt>лаг</dt>
          <dd>{measure.lag} кварт.</dd>
        </div>
        <div>
          <dt>горизонт</dt>
          <dd>{scenario.horizon} кварт.</dd>
        </div>
      </dl>
      <h3>Эффекты до учёта лага</h3>
      <ul className="effect-list">
        {Object.entries(measure.effects).map(([id, value]) => (
          <li key={id}>
            <span>
              {id} ·{' '}
              {scenario.indicators.find((entry) => entry.id === id)!.name}
            </span>
            <span className={value < 0 ? 'danger' : 'positive'}>
              {signed(value)}
            </span>
          </li>
        ))}
      </ul>
      {measure.scope === 'district' && (
        <fieldset>
          <legend>выберите район</legend>
          {scenario.districts.map((entry) => (
            <label className="district-option" key={entry.id}>
              <input
                type="radio"
                name="district"
                checked={districtId === entry.id}
                onChange={() => setDistrict(entry.id)}
              />
              <span>
                {entry.name}
                <small>{entry.profile}</small>
              </span>
            </label>
          ))}
        </fieldset>
      )}
      <button
        className="primary"
        disabled={measure.scope === 'district' && !districtId}
        onClick={() =>
          onAdd(
            measure.scope === 'city'
              ? { measureId: measure.id }
              : { measureId: measure.id, districtId },
          )
        }
      >
        добавить меру →
      </button>
    </Modal>
  );
}
