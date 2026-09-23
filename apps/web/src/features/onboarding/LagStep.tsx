export function LagStep({
  lag,
  onLag,
}: {
  lag: number;
  onLag: (lag: number) => void;
}) {
  // This is an illustrative slider; real plan effects remain server-calculated.
  const working = 8 - lag;
  const effect = (16 * working) / 8;
  return (
    <div className="onboarding-columns">
      <div className="onboarding-copy">
        <p>
          Симуляция длится 8 кварталов — 2 года. Пока мера строится, она не
          работает.
        </p>
        <p>
          Школа с детсадом в Нуре строится 3 квартала и работает 5 из 8: вместо
          +16 к показателю «школы» даёт +10.
        </p>
        <p className="muted">
          Поэтому дорогие долгие проекты вроде ЛРТ не так выгодны, как кажутся.
          Мера с лагом 4 даёт ровно половину эффекта.
        </p>
      </div>
      <div className="onboarding-lag">
        <div
          className="onboarding-segments"
          role="group"
          aria-label="Лаг в кварталах"
        >
          <span className="muted">лаг</span>
          {[0, 1, 2, 3, 4].map((value) => (
            <button
              key={value}
              aria-pressed={lag === value}
              onClick={() => onLag(value)}
            >
              {value}
            </button>
          ))}
        </div>
        <ol className="onboarding-timeline" aria-label="Восемь кварталов">
          {Array.from({ length: 8 }, (_, index) => (
            <li key={index} className={index < lag ? 'building' : 'working'}>
              <span className="sr-only">
                {index < lag ? 'строится' : 'работает'}: квартал{' '}
              </span>
              {index + 1}
            </li>
          ))}
        </ol>
        <div className="onboarding-legend muted">
          <span>┄ строится</span>
          <span>
            <b className="positive">■</b> работает
          </span>
        </div>
        <div aria-live="polite" aria-atomic="true">
          <dl className="onboarding-values">
            <dt>работает</dt>
            <dd>{working} из 8 кварталов</dd>
            <dt>эффект</dt>
            <dd>
              +16 × {working}/8 = +{effect}
            </dd>
            <dt>школы Нуры</dt>
            <dd className="positive">38 → {38 + effect}</dd>
          </dl>
          <small className="muted">
            {lag === 3 ? 'лаг школы — 3' : 'для примера: у школы лаг 3'}
          </small>
        </div>
      </div>
    </div>
  );
}
