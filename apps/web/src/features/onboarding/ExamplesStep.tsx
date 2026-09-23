export function ExamplesStep({
  example,
  onExample,
}: {
  example: 'school' | 'crossings';
  onExample: (example: 'school' | 'crossings') => void;
}) {
  return (
    <div className="onboarding-columns">
      <div className="onboarding-copy">
        <p>
          Школа в Нуре даёт около +1.45. Из них +1.00 — за снятый провал:
          показатель «школы» поднялся выше 40.
        </p>
        <p>
          Большая часть пользы — снятый провал, а не рост среднего. Это главная
          идея модели.
        </p>
        <p className="muted">
          Обратный пример: безопасные переходы в Алматы опускают разгрузку дорог
          ниже 40 — и балл падает.
        </p>
      </div>
      <div>
        <div className="onboarding-segments" role="group" aria-label="Пример">
          <button
            aria-pressed={example === 'school'}
            onClick={() => onExample('school')}
          >
            школа · Нура
          </button>
          <button
            aria-pressed={example === 'crossings'}
            onClick={() => onExample('crossings')}
          >
            переходы · Алматы
          </button>
        </div>
        <div className="onboarding-example" aria-live="polite">
          {example === 'school' ? (
            <>
              <dl className="onboarding-contributions">
                {[
                  ['средняя по городу', '+0.12', '12%'],
                  ['худший район', '+0.33', '33%'],
                  ['снят провал', '+1.00', '100%'],
                ].map(([label, value, width]) => (
                  <div key={label}>
                    <dt>{label}</dt>
                    <dd>
                      <span className="onboarding-bar" aria-hidden="true">
                        <span style={{ width }} />
                      </span>
                      <span className="positive">{value}</span>
                    </dd>
                  </div>
                ))}
                <div className="onboarding-total">
                  <dt>итого</dt>
                  <dd>≈ +1.45</dd>
                </div>
              </dl>
              <p className="muted">
                школы Нуры 38 → 48 · оценка Нуры 49.18 → 50.28
              </p>
            </>
          ) : (
            <>
              <dl className="onboarding-values">
                <dt>разгрузка дорог</dt>
                <dd>
                  40 → <span className="danger">38.25</span>
                  <small className="muted"> · −2 × 7/8</small>
                </dd>
                <dt>новый провал</dt>
                <dd className="danger">штраф −1</dd>
                <dt>итог для балла</dt>
                <dd className="danger">−0.87</dd>
              </dl>
              <div className="onboarding-negative-bar" aria-hidden="true" />
              <p className="muted">
                Мера улучшает безопасность, но создаёт провал в разгрузке дорог.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
