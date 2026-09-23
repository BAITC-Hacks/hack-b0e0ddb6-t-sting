import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { App } from '../../src/App';
import { getScenario, validatePlan } from '../../src/api/simulation';
import { emptyValidation, scenario, valid } from '../fixtures/scenario';

vi.mock('../../src/api/health', () => ({
  checkHealth: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../../src/api/simulation', () => ({
  getScenario: vi.fn(),
  validatePlan: vi.fn(),
}));

beforeEach(() => {
  localStorage.clear();
  vi.mocked(getScenario).mockReset().mockResolvedValue(scenario);
  vi.mocked(validatePlan)
    .mockReset()
    .mockImplementation(async (plan) =>
      plan.length === 5 ? valid : emptyValidation,
    );
});

it('opens the introduction only after the scenario loads', async () => {
  render(<App />);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(await screen.findByRole('dialog')).toHaveTextContent(
    'Симулятор плана развития города',
  );
  expect(screen.getByRole('button', { name: /назад/ })).toBeDisabled();
});

it('remembers dismissal and allows reopening without changing the selected plan', async () => {
  const { unmount } = render(<App />);
  fireEvent.click(await screen.findByRole('button', { name: 'пропустить' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  unmount();
  render(<App />);
  fireEvent.click(await screen.findByRole('button', { name: 'пример плана' }));
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'разобрать партию' }),
    ).toBeEnabled(),
  );
  const help = screen.getByRole('button', { name: /как это работает/ });
  help.focus();
  fireEvent.click(help);
  expect(screen.getByRole('dialog')).toHaveTextContent(
    'Симулятор плана развития города',
  );
  fireEvent.click(screen.getByRole('button', { name: 'Шаг 7: Результаты' }));
  fireEvent.click(screen.getByRole('button', { name: 'собрать план →' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(help).toHaveFocus();
  expect(
    screen.getByRole('button', { name: 'Удалить M7' }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole('button', { name: 'разобрать партию' }),
  ).toBeEnabled();
});

it('remains usable when browser storage is blocked', async () => {
  vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('blocked');
  });
  render(<App />);
  fireEvent.keyDown(await screen.findByRole('dialog'), { key: 'Escape' });
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: /как это работает/ }));
  expect(screen.getByRole('dialog')).toHaveTextContent(
    'Симулятор плана развития города',
  );
});
