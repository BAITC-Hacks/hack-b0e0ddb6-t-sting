import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../src/App';
import { checkHealth } from '../src/api/health';
import {
  analyzePlan,
  getScenario,
  getSubmissions,
  reviewPlan,
  submitPlan,
  validatePlan,
} from '../src/api/simulation';
import {
  analysis,
  emptyValidation,
  review,
  scenario,
  submission,
  valid,
} from './fixtures/scenario';
vi.mock('../src/api/health', () => ({ checkHealth: vi.fn() }));
vi.mock('../src/api/simulation', () => ({
  getScenario: vi.fn(),
  validatePlan: vi.fn(),
  reviewPlan: vi.fn(),
  analyzePlan: vi.fn(),
  getSubmissions: vi.fn(),
  submitPlan: vi.fn(),
}));
beforeEach(() => {
  localStorage.setItem('qol-sim:onboarding:v1', 'seen');
  vi.mocked(checkHealth).mockReset().mockResolvedValue();
  vi.mocked(getScenario).mockReset().mockResolvedValue(scenario);
  vi.mocked(validatePlan)
    .mockReset()
    .mockImplementation(async (plan) =>
      plan.length === 5 ? valid : emptyValidation,
    );
  vi.mocked(reviewPlan).mockReset().mockResolvedValue(review);
  vi.mocked(analyzePlan).mockReset().mockResolvedValue(analysis);
  vi.mocked(getSubmissions).mockReset().mockResolvedValue([]);
  vi.mocked(submitPlan).mockReset().mockResolvedValue(submission);
});
describe('application journey', () => {
  it('waits for the scenario and connection and exposes a retryable health check', async () => {
    let ready!: (value: typeof scenario) => void;
    let healthy!: () => void;
    vi.mocked(getScenario).mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          ready = resolve;
        }),
    );
    vi.mocked(checkHealth)
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            healthy = resolve;
          }),
      )
      .mockRejectedValueOnce(new Error('down'))
      .mockResolvedValueOnce();
    render(<App />);
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'подготовка сценария',
    );
    expect(screen.getByRole('button', { name: 'проверка API' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'результаты' })).toBeDisabled();
    await act(() => {
      ready(scenario);
      healthy();
    });
    expect(
      await screen.findByRole('heading', {
        name: 'Конструктор плана развития Астаны',
      }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'API подключён · проверить' }),
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'API недоступен · повторить' }),
    );
    expect(
      await screen.findByRole('button', { name: 'API подключён · проверить' }),
    ).toBeEnabled();
  });
  it('retries a failed scenario without losing the application shell', async () => {
    vi.mocked(getScenario)
      .mockRejectedValueOnce(new Error('Сценарий недоступен'))
      .mockResolvedValueOnce(scenario);
    render(<App />);
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Сценарий недоступен',
    );
    expect(
      screen.getByRole('heading', { name: '# сценарий недоступен' }),
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'повторить попытку ↻' }),
    );
    expect(
      await screen.findByRole('heading', {
        name: 'Конструктор плана развития Астаны',
      }),
    ).toBeInTheDocument();
    expect(
      await screen.findByRole('list', { name: 'Нарушения правил' }),
    ).toHaveTextContent('Выберите ровно 5 мер.');
  });
  it('reviews a server-validated plan, reapplies a swap, and invalidates results after editing', async () => {
    render(<App />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'пример плана' }),
    );
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'разобрать партию' }),
      ).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'разобрать партию' }));
    expect(
      await screen.findByRole('region', { name: 'Результат плана' }),
    ).toHaveTextContent('56,54');
    expect(reviewPlan).toHaveBeenCalledWith(scenario.examples.strong);
    fireEvent.click(
      screen.getByRole('button', { name: 'Применить замену M5 на M3' }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'подтвердить замену →' }),
    );
    await waitFor(() =>
      expect(reviewPlan).toHaveBeenLastCalledWith([
        ...scenario.examples.strong.slice(0, 4),
        { measureId: 'M3', districtId: 'nura' },
      ]),
    );
    expect(
      await screen.findByRole('region', { name: 'Результат плана' }),
    ).toHaveTextContent('56,54');
    fireEvent.click(screen.getByRole('button', { name: 'отправить в реестр' }));
    fireEvent.change(
      screen.getByRole('textbox', { name: 'название команды' }),
      { target: { value: 'Астана' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'отправить план →' }));
    fireEvent.click(
      await screen.findByRole('button', { name: 'открыть реестр →' }),
    );
    expect(await screen.findByText('Реестр пока пуст.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'в конструктор →' }));
    expect(
      screen.getByRole('heading', {
        name: 'Конструктор плана развития Астаны',
      }),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'результаты' }));
    expect(
      await screen.findByRole('region', { name: 'Результат плана' }),
    ).toHaveTextContent('56,54');
    fireEvent.click(screen.getByRole('button', { name: 'конструктор' }));
    fireEvent.click(screen.getByRole('button', { name: 'Удалить M7' }));
    expect(screen.getByRole('button', { name: 'результаты' })).toBeDisabled();
    expect(
      await screen.findByRole('list', { name: 'Нарушения правил' }),
    ).toHaveTextContent('Выберите ровно 5 мер.');
  });
});
