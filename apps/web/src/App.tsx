import { useCallback, useState } from 'react';
import type { Plan } from './api/contracts';
import { getScenario } from './api/simulation';
import { Failure, Loading } from './components/Feedback';
import { Header, type Page } from './components/Header';
import { Builder } from './features/builder/Builder';
import { ReviewPage } from './features/review/ReviewPage';
import { Registry } from './features/submissions/Registry';
import { useResource } from './hooks/useResource';
import { Onboarding } from './features/onboarding/Onboarding';
import {
  needsOnboarding,
  rememberOnboarding,
} from './features/onboarding/storage';
export function App() {
  const { state, retry } = useResource(getScenario);
  const [page, setPage] = useState<Page>('builder');
  const [plan, setPlan] = useState<Plan>([]);
  const [canReview, setCanReview] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(needsOnboarding);
  const closeOnboarding = useCallback(() => {
    rememberOnboarding();
    setShowOnboarding(false);
  }, []);
  function changePlan(next: Plan) {
    setPlan(next);
    setCanReview(false);
  }
  return (
    <main className="app-shell">
      <Header
        page={page}
        version={
          state.status === 'success' ? state.data.version : 'загрузка сценария'
        }
        canReview={canReview}
        onPage={setPage}
        onHelp={() => {
          setPage('builder');
          setShowOnboarding(true);
        }}
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
          {showOnboarding && <Onboarding onClose={closeOnboarding} />}
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
