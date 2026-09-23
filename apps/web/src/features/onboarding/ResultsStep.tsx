import { useId } from 'react';

export function ResultsStep({
  expanded,
  onToggle,
}: {
  expanded: boolean;
  onToggle: () => void;
}) {
  const glossaryId = useId();
  return (
    <div className="onboarding-results">
      <p>
        На экране результатов важны три вещи. Формулы и детали — под
        «подробнее».
      </p>
      <ol>
        <li>
          <span>балл и прирост</span>
          <p>
            <strong>56.54</strong> <span className="positive">+3.99</span> к
            базе · лучше 99.9% планов
          </p>
        </li>
        <li>
          <span>что помогло и навредило</span>
          <p>
            Школа · Нура: <span className="positive">+1.45</span> · ключевая —
            сняла провал в Нуре
          </p>
        </li>
        <li>
          <span>что поменять</span>
          <p>
            Чистое топливо · Сарыарка → ЛРТ · Нура:{' '}
            <span className="positive">+0.66</span> · кнопка «применить»
            пересчитает результат
          </p>
        </li>
      </ol>
      <small className="muted">
        Пример сильного плана. Прирост рассчитан до округления итоговых баллов.
      </small>
      <button
        className="onboarding-glossary-toggle"
        aria-expanded={expanded}
        aria-controls={glossaryId}
        onClick={onToggle}
      >
        {expanded ? 'скрыть термины' : 'подробнее: термины'}
      </button>
      {expanded && (
        <dl className="onboarding-glossary" id={glossaryId}>
          <dt>процентиль</dt>
          <dd>
            Место среди всех 694 395 допустимых планов: показывает, какой
            процент планов хуже вашего.
          </dd>
          <dt>КПД</dt>
          <dd>Доля максимально возможного улучшения: +3.99 из +4.68 ≈ 85%.</dd>
          <dt>вклад меры</dt>
          <dd>
            Честная доля в общем приросте — как при делении общего счёта.
            Учитывает сочетания с другими мерами.
          </dd>
          <dt>оценка меры</dt>
          <dd>
            Насколько можно улучшить план, заменив её; отрицательный вклад
            означает, что мера навредила общему результату.
          </dd>
          <dt>синергия</dt>
          <dd>
            Дополнительные +2 к показателю, если выбраны обе меры пары, например
            камеры и цифровая платформа.
          </dd>
        </dl>
      )}
    </div>
  );
}
