import { useState } from 'react';
import type { Plan, Submission } from '../../api/contracts';
import { submitPlan } from '../../api/simulation';
import { Modal } from '../../components/Modal';
import { number } from '../../components/format';
export function SubmissionForm({
  plan,
  onClose,
  onRegistry,
}: {
  plan: Plan;
  onClose: () => void;
  onRegistry: () => void;
}) {
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [submission, setSubmission] = useState<Submission | null>(null);
  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) {
      setError('Введите название команды.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      setSubmission(await submitPlan(name.trim(), plan));
    } catch (error) {
      setError((error as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <Modal title="Отправить в реестр" onClose={onClose}>
      {submission ? (
        <div role="status">
          <p className="positive">
            План команды «{submission.teamName}» сохранён.
          </p>
          <p>
            Score {number(submission.score)} · ранг {number(submission.rank)}
          </p>
          <button className="primary" onClick={onRegistry}>
            открыть реестр →
          </button>
        </div>
      ) : (
        <form onSubmit={submit}>
          <p className="muted">
            Результат пересчитывается сервером. В реестре показан лучший план
            каждой команды.
          </p>
          <label className="field-label" htmlFor="team-name">
            название команды
          </label>
          <input
            id="team-name"
            maxLength={40}
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="ваша команда"
            disabled={busy}
          />
          <span className="field-hint muted">до 40 символов</span>
          {error && (
            <p className="danger" role="alert">
              {error}
            </p>
          )}
          <button className="primary" type="submit" disabled={busy}>
            {busy ? 'сохраняем…' : 'отправить план →'}
          </button>
        </form>
      )}
    </Modal>
  );
}
