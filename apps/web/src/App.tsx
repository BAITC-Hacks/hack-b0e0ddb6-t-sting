import { useState } from 'react';
import type { Plan } from './api/contracts';
import { getScenario } from './api/simulation';
import { Failure, Loading } from './components/Feedback';
import { Header, type Page } from './components/Header';
import { Builder } from './features/builder/Builder';
import { CouncilPage } from './features/council/CouncilPage';
import {
  clearCouncilSession,
  savedCouncilPlan,
  savedCouncilSession,
  saveCouncilPlan,
  saveCouncilSession,
} from './features/council/storage';
import { ReviewPage } from './features/review/ReviewPage';
import { Registry } from './features/submissions/Registry';
import { useResource } from './hooks/useResource';
export function App() {
  const { state, retry } = useResource(getScenario);
  const [sessionId, setSessionId] = useState(savedCouncilSession);
  const [page, setPage] = useState<Page>(() =>
    savedCouncilSession() ? 'council' : 'builder',
  );
  const [plan, setPlan] = useState<Plan>(savedCouncilPlan);
  const [canReview, setCanReview] = useState(() =>
    Boolean(savedCouncilSession() && savedCouncilPlan().length),
  );
  function changePlan(next: Plan) {
    setPlan(next);
    setCanReview(false);
    setSessionId(null);
    clearCouncilSession();
  }
  function applyCouncilPlan(next: Plan) {
    setPlan(next);
    setCanReview(true);
    saveCouncilPlan(next);
    setPage('review');
  }
  return (
    <main className="app-shell">
      <Header
        page={page}
        version={
          state.status === 'success' ? state.data.version : 'загрузка сценария'
        }
        canReview={canReview}
        canCouncil={Boolean(sessionId)}
        onPage={setPage}
      />
      {state.status === 'loading' && (
        <section className="page-state">
          <h1># подготовка сценария</h1>
          <Loading>загружаем районы, показатели и меры…</Loading>
        </section>
      )}
      {state.status === 'error' && (
        <section className="page-state">
          <h1># сценарий недоступен</h1>
          <Failure message={state.message} retry={retry} />
        </section>
      )}
      {state.status === 'success' && (
        <>
          {page === 'builder' && (
            <>
              <h1 className="sr-only">Конструктор плана развития Астаны</h1>
              <Builder
                scenario={state.data}
                plan={plan}
                onChange={changePlan}
                onReview={() => {
                  setCanReview(true);
                  setPage('review');
                }}
              />
            </>
          )}
          {page === 'review' && (
            <ReviewPage
              key={JSON.stringify(plan)}
              scenario={state.data}
              plan={plan}
              onApply={setPlan}
              onRegistry={() => setPage('registry')}
              onCouncil={(id) => {
                setSessionId(id);
                saveCouncilSession(id, plan);
                setPage('council');
              }}
              onReplayCouncil={sessionId ? () => setPage('council') : undefined}
            />
          )}
          {page === 'council' && sessionId && (
            <CouncilPage
              sessionId={sessionId}
              scenario={state.data}
              onBack={() => setPage(plan.length ? 'review' : 'builder')}
              onApply={applyCouncilPlan}
            />
          )}
          {page === 'registry' && (
            <Registry onBuild={() => setPage('builder')} />
          )}
        </>
      )}
      <footer className="footer">
        <span>Астана · симулятор городских решений</span>
        <span>
          условные данные / горизонт{' '}
          {state.status === 'success' ? state.data.horizon : '—'} кварталов
        </span>
      </footer>
    </main>
  );
}
