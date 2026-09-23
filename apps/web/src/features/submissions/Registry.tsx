import { getSubmissions } from '../../api/simulation';
import { Failure, Loading } from '../../components/Feedback';
import { number } from '../../components/format';
import { useResource } from '../../hooks/useResource';
export function Registry({ onBuild }: { onBuild: () => void }) {
  const { state, retry } = useResource(getSubmissions);
  return (
    <section className="registry">
      <div className="section-heading">
        <h1># реестр планов</h1>
        <button onClick={retry}>обновить ↻</button>
      </div>
      <p className="muted">
        Лучший результат каждой команды · единый сценарий и бюджет.
      </p>
      {state.status === 'loading' && <Loading>загружаем реестр…</Loading>}
      {state.status === 'error' && (
        <Failure message={state.message} retry={retry} />
      )}
      {state.status === 'success' &&
        (state.data.length === 0 ? (
          <div className="registry-empty">
            <p>Реестр пока пуст.</p>
            <p className="muted">
              Соберите план, запустите разбор и отправьте результат первым.
            </p>
            <button className="outline" onClick={onBuild}>
              в конструктор →
            </button>
          </div>
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>место</th>
                  <th>команда</th>
                  <th>score</th>
                  <th>ранг плана</th>
                  <th>план</th>
                </tr>
              </thead>
              <tbody>
                {state.data.map((entry, index) => (
                  <tr key={entry.id}>
                    <td>{index + 1}</td>
                    <th scope="row">{entry.teamName}</th>
                    <td className="positive">{number(entry.score)}</td>
                    <td>{number(entry.rank)}</td>
                    <td>
                      {entry.plan.map((item) => item.measureId).join(' · ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
    </section>
  );
}
