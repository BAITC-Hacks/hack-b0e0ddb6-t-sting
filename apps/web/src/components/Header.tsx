import { checkHealth } from '../api/health';
import { useResource } from '../hooks/useResource';
export type Page = 'builder' | 'review' | 'registry';
const labels = {
  builder: 'конструктор',
  review: 'результаты',
  registry: 'реестр',
};
export function Header({
  page,
  version,
  canReview,
  onPage,
}: {
  page: Page;
  version: string;
  canReview: boolean;
  onPage: (page: Page) => void;
}) {
  const { state, retry } = useResource(checkHealth);
  const health = {
    loading: 'проверка API',
    error: 'API недоступен · повторить',
    success: 'API подключён · проверить',
  };
  return (
    <header className="masthead">
      <div className="brand">
        <span>qol-sim</span>
        <span className="muted">
          {' '}
          / {version} / {labels[page]}
        </span>
      </div>
      <div className="header-controls">
        <nav aria-label="Разделы">
          {(Object.keys(labels) as Page[]).map((key) => (
            <button
              key={key}
              aria-current={page === key ? 'page' : undefined}
              disabled={key === 'review' && !canReview}
              onClick={() => onPage(key)}
            >
              {page === key ? `[${labels[key]}]` : labels[key]}
            </button>
          ))}
        </nav>
        <button
          className={`api-status ${state.status}`}
          disabled={state.status === 'loading'}
          onClick={retry}
          aria-label={health[state.status]}
          title={health[state.status]}
        >
          <span aria-hidden="true" />
          api
        </button>
      </div>
    </header>
  );
}
