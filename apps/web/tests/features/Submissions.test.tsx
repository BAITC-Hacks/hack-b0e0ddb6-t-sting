import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getSubmissions, submitPlan } from '../../src/api/simulation';
import { Registry } from '../../src/features/submissions/Registry';
import { SubmissionForm } from '../../src/features/submissions/SubmissionForm';
import { scenario, submission } from '../fixtures/scenario';
vi.mock('../../src/api/simulation', () => ({
  getSubmissions: vi.fn(),
  submitPlan: vi.fn(),
}));
beforeEach(() => {
  vi.mocked(getSubmissions).mockReset();
  vi.mocked(submitPlan).mockReset();
});
describe('submission form', () => {
  it('validates empty names, preserves a failed name, and saves a trimmed name on retry', async () => {
    let finish!: (value: typeof submission) => void;
    vi.mocked(submitPlan)
      .mockRejectedValueOnce(new Error('Не удалось сохранить'))
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            finish = resolve;
          }),
      );
    const registry = vi.fn();
    render(
      <SubmissionForm
        plan={scenario.examples.strong}
        onClose={vi.fn()}
        onRegistry={registry}
      />,
    );
    const input = screen.getByRole('textbox', { name: 'название команды' });
    expect(input).toHaveAttribute('maxlength', '40');
    fireEvent.change(input, { target: { value: '  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'отправить план →' }));
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Введите название команды.',
    );
    expect(submitPlan).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: '  Астана  ' } });
    fireEvent.click(screen.getByRole('button', { name: 'отправить план →' }));
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Не удалось сохранить',
    );
    expect(input).toHaveValue('  Астана  ');
    fireEvent.click(screen.getByRole('button', { name: 'отправить план →' }));
    expect(screen.getByRole('button', { name: 'сохраняем…' })).toBeDisabled();
    expect(input).toBeDisabled();
    await act(() => finish(submission));
    expect(screen.getByRole('status')).toHaveTextContent(
      'План команды «Астана» сохранён.',
    );
    expect(submitPlan).toHaveBeenLastCalledWith(
      'Астана',
      scenario.examples.strong,
    );
    fireEvent.click(screen.getByRole('button', { name: 'открыть реестр →' }));
    expect(registry).toHaveBeenCalledOnce();
  });
});
describe('registry', () => {
  it('supports loading, error, retry, empty state and returning to the constructor', async () => {
    vi.mocked(getSubmissions)
      .mockRejectedValueOnce(new Error('Реестр недоступен'))
      .mockResolvedValueOnce([]);
    const build = vi.fn();
    render(<Registry onBuild={build} />);
    expect(screen.getByRole('status')).toHaveTextContent('загружаем реестр');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Реестр недоступен',
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'повторить попытку ↻' }),
    );
    expect(await screen.findByText('Реестр пока пуст.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'в конструктор →' }));
    expect(build).toHaveBeenCalledOnce();
  });
  it('shows ranked team results and refreshes the table', async () => {
    vi.mocked(getSubmissions)
      .mockResolvedValueOnce([submission])
      .mockResolvedValueOnce([{ ...submission, score: 57.21 }]);
    render(<Registry onBuild={vi.fn()} />);
    expect(
      await screen.findByRole('rowheader', { name: 'Астана' }),
    ).toBeInTheDocument();
    expect(screen.getByRole('cell', { name: '56,54' })).toBeInTheDocument();
    expect(
      screen.getByRole('cell', { name: 'M7 · M8 · M10 · M12 · M5' }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'обновить ↻' }));
    expect(
      await screen.findByRole('cell', { name: '57,21' }),
    ).toBeInTheDocument();
  });
});
