import { useCallback } from 'react';
import './analyst.css';
import type { Plan } from '../../api/contracts';
import { analyzePlan } from '../../api/simulation';
import { Loading, Failure } from '../../components/Feedback';
import { useResource } from '../../hooks/useResource';
const sections = [
  ['strengths', 'Сильные стороны'],
  ['risks', 'Риски'],
  ['consequences', 'Последствия'],
  ['recommendations', 'Рекомендации'],
] as const;
export function AiReport({ plan }: { plan: Plan }) {
  const load = useCallback(() => analyzePlan(plan), [plan]);
  const { state, retry } = useResource(load);
  return (
    <section className="ai-report" aria-label="Отчёт аналитика">
      <div className="section-heading">
        <h2># аналитик</h2>
        {state.status === 'success' && (
          <span className="muted">
            {state.data.source === 'llm' ? 'AI' : 'офлайн'}
          </span>
        )}
      </div>
      {state.status === 'loading' && (
        <Loading>аналитик проверяет последствия плана…</Loading>
      )}
      {state.status === 'error' && (
        <Failure message={state.message} retry={retry} />
      )}
      {state.status === 'success' && (
        <>
          <p className="analysis-summary">{state.data.summary}</p>
          <div className="analysis-sections">
            {sections.map(([key, label]) => (
              <section key={key}>
                <h3>{label}</h3>
                <ul>
                  {state.data[key].map((line, index) => (
                    <li key={index}>{line}</li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
          <details>
            <summary>
              журнал инструментов · {state.data.trace.length} вызовов
            </summary>
            <p className="muted">
              Проверки движка, использованные при подготовке отчёта.
            </p>
            {state.data.trace.length === 0 && (
              <p className="muted">Дополнительные инструменты не вызывались.</p>
            )}
            <ol className="tool-log">
              {state.data.trace.map((entry, index) => (
                <li key={index}>
                  <span>{entry.tool}</span>
                  <pre>{JSON.stringify(entry.input, null, 2)}</pre>
                </li>
              ))}
            </ol>
          </details>
        </>
      )}
    </section>
  );
}
