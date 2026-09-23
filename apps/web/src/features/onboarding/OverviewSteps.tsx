import { mapGeometry } from '../../components/mapGeometry';

export function IntroStep() {
  return (
    <div className="onboarding-columns">
      <div className="onboarding-copy">
        <p>
          У вас 100 единиц бюджета и каталог из 14 городских мер. Нужно выбрать
          ровно 5.
        </p>
        <p>
          Движок применяет меры к показателям районов и считает один итоговый
          балл — Astana Quality of Life Score.
        </p>
        <p className="muted">
          ИИ ничего не считает: он получает готовые цифры и объясняет словами,
          что получилось и почему.
        </p>
      </div>
      <ol className="onboarding-pipeline" aria-label="От плана к объяснению">
        {[
          ['план', '5 мер из 14', 'бюджет ≤ 100'],
          ['движок', 'считает все цифры', 'одинаково для всех'],
          ['score', 'одно итоговое число', 'и место среди всех планов'],
          ['ИИ', 'объясняет словами', 'только по цифрам движка'],
        ].map(([name, title, detail]) => (
          <li key={name}>
            <span className="muted">{name}</span>
            <div>
              {title}
              <small className="muted">{detail}</small>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

const districts = [
  { id: 'saryarka', name: 'Сарыарка', note: '' },
  { id: 'baikonur', name: 'Байконур', note: '13%' },
  { id: 'almaty', name: 'Алматы', note: '' },
  { id: 'yesil', name: 'Есиль', note: '27% жителей' },
  { id: 'nura', name: 'Нура', note: 'школы 38' },
] as const;

export function CityStep() {
  return (
    <div className="onboarding-columns">
      <div className="onboarding-copy">
        <p>
          У каждого района 10 показателей по шкале 0–100: пробки, школы, воздух
          и другие. Оценка района — взвешенное среднее этих показателей.
        </p>
        <p>Показатель ниже 40 — провал, за каждый начисляется штраф.</p>
        <p>
          Сейчас провалов два, оба в Нуре:{' '}
          <span className="danger">школы 38</span> и{' '}
          <span className="danger">поликлиники 35</span>.
        </p>
      </div>
      <figure className="onboarding-city">
        <svg
          viewBox="0 0 600 440"
          role="img"
          aria-label="Схема районов: в Нуре два провала — школы 38 и поликлиники 35"
        >
          {districts.map(({ id, name, note }) => {
            const shape = mapGeometry[id];
            return (
              <g key={id} className={id === 'nura' ? 'critical' : ''}>
                <polygon points={shape.points} />
                <text x={shape.x} y={shape.y}>
                  {name}
                </text>
                <text
                  className="onboarding-map-note"
                  x={shape.x}
                  y={shape.y + 24}
                >
                  {note}
                </text>
                {id === 'nura' && (
                  <text
                    className="onboarding-map-note"
                    x={shape.x}
                    y={shape.y + 48}
                  >
                    поликлиники 35
                  </text>
                )}
              </g>
            );
          })}
          <polyline
            points="0,252 20,250 140,232 250,258 360,240 470,262 580,245 600,244"
            fill="none"
            stroke="#35505c"
            strokeWidth="3"
          />
        </svg>
        <figcaption>
          <span>
            <b className="danger">■</b> показатель &lt; 40 — провал
          </span>
          <span>данные условные</span>
        </figcaption>
      </figure>
    </div>
  );
}

export function RulesStep() {
  return (
    <div className="onboarding-columns">
      <div className="onboarding-copy">
        <p>
          Ровно 5 разных мер, не больше 100 единиц бюджета и не больше 2 мер
          одного направления.
        </p>
        <p>
          Некоторые пары запрещены — например, автобусные полосы и ЛРТ сразу.
        </p>
        <p>
          У части мер нужно выбрать район на карте, остальные действуют на весь
          город.
        </p>
        <p className="muted">
          Конструктор проверяет правила сразу: симуляцию можно запустить только
          с допустимым планом.
        </p>
      </div>
      <div className="onboarding-rule-card">
        <div className="onboarding-budget">
          <span className="muted">бюджет</span>
          <span>95 / 100</span>
        </div>
        <div className="onboarding-budget-track">
          <span />
        </div>
        <ul aria-label="Пример проверки плана">
          <li>
            <span className="positive">ok</span>
            <span>ровно 5 разных мер</span>
            <small>5 / 5</small>
          </li>
          <li>
            <span className="positive">ok</span>
            <span>бюджет</span>
            <small>95 / 100</small>
          </li>
          <li>
            <span className="positive">ok</span>
            <span>≤ 2 мер одного направления</span>
          </li>
          <li className="danger">
            <span>×</span>
            <span>автобусные полосы + ЛРТ</span>
            <small>запрещено</small>
          </li>
          <li>
            <span className="muted">··</span>
            <span>район для районных мер</span>
            <small>на карте</small>
          </li>
        </ul>
      </div>
    </div>
  );
}

export function ScoreStep() {
  return (
    <div className="onboarding-columns">
      <div className="onboarding-copy">
        <p>Итоговый балл складывается из трёх частей.</p>
        <p>
          В средней районы весят по доле жителей: Есиль (27%) влияет сильнее
          Байконура (13%).
        </p>
        <p>
          Часть «худший район» не даёт вложить всё в центр и забыть окраину.
        </p>
      </div>
      <div>
        <dl className="onboarding-formula">
          <div>
            <dt>0.7 × средняя по городу</dt>
            <dd>по доле жителей</dd>
          </div>
          <div>
            <dt>+ 0.3 × худший район</dt>
            <dd>сейчас — Нура</dd>
          </div>
          <div>
            <dt>− 1 × число провалов</dt>
            <dd>сейчас 2</dd>
          </div>
          <div>
            <dt>
              = <strong>52.56</strong>
            </dt>
            <dd>без единой меры</dd>
          </div>
        </dl>
        <p className="onboarding-callout">
          Коротко: 30% оценки зависит от самого слабого района, а каждый
          показатель ниже 40 — штраф.
        </p>
      </div>
    </div>
  );
}
