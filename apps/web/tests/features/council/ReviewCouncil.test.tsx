import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ReviewPage } from '../../../src/features/review/ReviewPage';
import { analyzePlan, reviewPlan } from '../../../src/api/simulation';
import { createCouncilSession } from '../../../src/api/council';
import { analysis, review, scenario } from '../../fixtures/scenario';

vi.mock('../../../src/api/simulation', () => ({
  reviewPlan: vi.fn(),
  analyzePlan: vi.fn(),
}));
vi.mock('../../../src/api/council', () => ({ createCouncilSession: vi.fn() }));
const props = {
  scenario,
  plan: scenario.examples.strong,
  onApply: vi.fn(),
  onRegistry: vi.fn(),
};
beforeEach(() => {
  vi.mocked(reviewPlan).mockReset().mockResolvedValue(review);
  vi.mocked(analyzePlan).mockReset().mockResolvedValue(analysis);
  vi.mocked(createCouncilSession).mockReset().mockResolvedValue('session-id');
});
async function launchDialog() {
  fireEvent.click(
    await screen.findByRole('button', { name: /вынести на совет/ }),
  );
  expect(screen.getByRole('dialog')).toHaveTextContent(
    'Семь вымышленных участников',
  );
}
describe('review council launch', () => {
  it('can cancel before any session is created', async () => {
    render(<ReviewPage {...props} onCouncil={vi.fn()} />);
    await launchDialog();
    fireEvent.click(screen.getByRole('button', { name: 'отмена' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(createCouncilSession).not.toHaveBeenCalled();
  });
  it('prevents duplicate launch until the API returns a persisted session id', async () => {
    let finish!: (value: string) => void;
    vi.mocked(createCouncilSession).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const open = vi.fn();
    render(<ReviewPage {...props} onCouncil={open} />);
    await launchDialog();
    fireEvent.click(screen.getByRole('button', { name: /начать заседание/ }));
    expect(screen.getByRole('button', { name: 'запускаем…' })).toBeDisabled();
    expect(open).not.toHaveBeenCalled();
    await act(() => finish('session-id'));
    expect(open).toHaveBeenCalledWith('session-id');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });
  it.each([new Error('Сервис недоступен'), null])(
    'shows a retryable launch error for %s',
    async (error) => {
      vi.mocked(createCouncilSession).mockRejectedValueOnce(error);
      const open = vi.fn();
      render(<ReviewPage {...props} onCouncil={open} />);
      await launchDialog();
      fireEvent.click(screen.getByRole('button', { name: /начать заседание/ }));
      expect(await screen.findByRole('alert')).toHaveTextContent(
        error instanceof Error
          ? 'Сервис недоступен'
          : 'Не удалось начать заседание.',
      );
      expect(open).not.toHaveBeenCalled();
      fireEvent.click(screen.getByRole('button', { name: /начать заседание/ }));
      await waitFor(() => expect(open).toHaveBeenCalledWith('session-id'));
    },
  );
  it('finishes safely when the parent removes its launch action during a pending request', async () => {
    let finish!: (value: string) => void;
    vi.mocked(createCouncilSession).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        }),
    );
    const { rerender } = render(<ReviewPage {...props} onCouncil={vi.fn()} />);
    await launchDialog();
    fireEvent.click(screen.getByRole('button', { name: /начать заседание/ }));
    rerender(<ReviewPage {...props} />);
    await act(() => finish('session-id'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'Результат плана' }),
    ).toHaveTextContent('56,54');
  });
});
