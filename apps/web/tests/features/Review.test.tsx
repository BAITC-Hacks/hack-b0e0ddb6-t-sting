import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { analyzePlan, reviewPlan, submitPlan } from '../../src/api/simulation';
import { AiReport } from '../../src/features/review/AiReport';
import { MoveList } from '../../src/features/review/MoveList';
import { ReviewPage } from '../../src/features/review/ReviewPage';
import { ScoreHistogram } from '../../src/features/review/ScoreHistogram';
import { analysis, review, scenario, submission } from '../fixtures/scenario';
vi.mock('../../src/api/simulation', () => ({
  reviewPlan: vi.fn(),
  analyzePlan: vi.fn(),
  submitPlan: vi.fn(),
}));
beforeEach(() => {
  vi.mocked(reviewPlan).mockReset().mockResolvedValue(review);
  vi.mocked(analyzePlan).mockReset().mockResolvedValue(analysis);
  vi.mocked(submitPlan).mockReset().mockResolvedValue(submission);
});
describe('analyst report', () => {
  it('loads independently, retries an error and exposes an auditable tool log', async () => {
    vi.mocked(analyzePlan)
      .mockRejectedValueOnce(new Error('Аналитик недоступен'))
      .mockResolvedValueOnce(analysis);
    render(<AiReport plan={scenario.examples.strong} />);
    expect(screen.getByRole('status')).toHaveTextContent('аналитик проверяет');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Аналитик недоступен',
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'повторить попытку ↻' }),
    );
    expect(await screen.findByText(analysis.summary)).toBeInTheDocument();
    expect(screen.getByText('офлайн')).toBeInTheDocument();
    expect(screen.getByText(analysis.risks[0])).toBeInTheDocument();
    fireEvent.click(screen.getByText('журнал инструментов · 1 вызовов'));
    expect(screen.getByText('evaluate_plan')).toBeVisible();
    expect(screen.getByText(/"districtId": "nura"/)).toBeVisible();
  });
  it('identifies the model source and explicitly reports an empty log', async () => {
    vi.mocked(analyzePlan).mockResolvedValue({
      ...analysis,
      source: 'llm',
      trace: [],
    });
    render(<AiReport plan={scenario.examples.strong} />);
    expect(await screen.findByText('AI')).toBeInTheDocument();
    fireEvent.click(screen.getByText('журнал инструментов · 0 вызовов'));
    expect(
      screen.getByText('Дополнительные инструменты не вызывались.'),
    ).toBeVisible();
  });
});
describe('review', () => {
  it('keeps analyst available when review fails and retries review', async () => {
    vi.mocked(reviewPlan)
      .mockRejectedValueOnce(new Error('Разбор недоступен'))
      .mockResolvedValueOnce({
        ...review,
        scoreDelta: -1,
        evaluation: { ...review.evaluation, score: 51.56 },
      });
    render(
      <ReviewPage
        scenario={scenario}
        plan={scenario.examples.strong}
        onApply={vi.fn()}
        onRegistry={vi.fn()}
      />,
    );
    expect(screen.getByText('движок разбирает партию…')).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Разбор недоступен',
    );
    expect(await screen.findByText(analysis.summary)).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'повторить попытку ↻' }),
    );
    expect(
      await screen.findByRole('region', { name: 'Результат плана' }),
    ).toHaveTextContent('51,56');
    expect(screen.getByText('-1')).toHaveClass('danger');
  });
  it('shows exact server deltas, confirms swaps and exposes the optimum only on request', async () => {
    const apply = vi.fn();
    const registry = vi.fn();
    render(
      <ReviewPage
        scenario={scenario}
        plan={scenario.examples.strong}
        onApply={apply}
        onRegistry={registry}
      />,
    );
    expect(await screen.findByText('+3,99')).toBeInTheDocument();
    expect(screen.getByText('99,92%')).toBeInTheDocument();
    expect(screen.getByText('85%')).toBeInTheDocument();
    expect(screen.getByText(/Средний балл города:/)).not.toBeVisible();
    fireEvent.click(screen.getByText('подробнее о результате'));
    expect(screen.getByText(/Средний балл города:/)).toBeVisible();
    expect(screen.getByText('?? грубая ошибка')).toBeInTheDocument();
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Применить замену M5 на M3' }),
    );
    expect(screen.getByRole('dialog')).toHaveAccessibleName(
      'Применить замену?',
    );
    expect(apply).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'отмена' }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Применить замену M5 на M3' }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'подтвердить замену →' }),
    );
    expect(apply).toHaveBeenCalledWith([
      ...scenario.examples.strong.slice(0, 4),
      { measureId: 'M3', districtId: 'nura' },
    ]);
    fireEvent.click(
      screen.getByRole('button', { name: 'показать оптимум [спойлер]' }),
    );
    const optimum = screen.getByRole('dialog', { name: 'Оптимальный план' });
    expect(within(optimum).getByText('57,23')).toBeInTheDocument();
    expect(
      within(optimum).getByText('Потенциал улучшения вашего плана: +0,69.'),
    ).toBeInTheDocument();
    expect(within(optimum).getAllByRole('listitem')).toHaveLength(5);
    fireEvent.click(
      within(optimum).getByRole('button', { name: 'Закрыть диалог' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'отправить в реестр' }));
    fireEvent.change(
      screen.getByRole('textbox', { name: 'название команды' }),
      { target: { value: 'Астана' } },
    );
    fireEvent.click(screen.getByRole('button', { name: 'отправить план →' }));
    fireEvent.click(
      await screen.findByRole('button', { name: 'открыть реестр →' }),
    );
    expect(registry).toHaveBeenCalledOnce();
  });
  it('explains when no one-move improvements remain and displays mistake grades', () => {
    render(
      <MoveList
        review={{
          ...review,
          moves: [{ ...review.moves[0], grade: 'mistake' }],
          topSwaps: [],
        }}
        scenario={scenario}
        onSwap={vi.fn()}
      />,
    );
    expect(screen.getByText('? ошибка')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Улучшающих замен нет. План оптимален среди одноходовых замен.',
      ),
    ).toBeInTheDocument();
  });
  it('keeps full measure names available and reveals alternative swaps on demand', () => {
    const onSwap = vi.fn();
    const alternative = {
      ...review.topSwaps[0],
      with: { measureId: 'M14' as const },
      gain: 0.44,
      scoreAfter: 56.98,
    };
    const third = {
      ...review.topSwaps[0],
      with: { measureId: 'M2' as const },
      gain: 0.33,
      scoreAfter: 56.87,
    };
    render(
      <MoveList
        review={{
          ...review,
          topSwaps: [review.topSwaps[0], alternative, third],
        }}
        scenario={scenario}
        onSwap={onSwap}
      />,
    );
    expect(
      screen.getByTitle('Школа + детсад (модульное строительство)'),
    ).toHaveTextContent('M7 · Нура');
    expect(
      screen.getByRole('button', { name: 'Применить замену M5 на M3' }),
    ).toBeVisible();
    expect(
      screen.getByRole('button', { name: 'Применить замену M5 на M14' }),
    ).not.toBeVisible();
    fireEvent.click(screen.getByText('ещё варианты · 2'));
    fireEvent.click(
      screen.getByRole('button', { name: 'Применить замену M5 на M14' }),
    );
    expect(onSwap).toHaveBeenLastCalledWith(alternative);
    fireEvent.click(
      screen.getByRole('button', { name: 'Применить замену M5 на M2' }),
    );
    expect(onSwap).toHaveBeenLastCalledWith(third);
  });
  it('plots the server distribution, with readable current and baseline markers', () => {
    render(<ScoreHistogram review={review} />);
    expect(screen.getByRole('img')).toHaveAccessibleName(
      'Распределение 694 395 планов. Ваш Score 56,54',
    );
    expect(screen.getByText('52–55: 200 планов')).toBeInTheDocument();
    expect(screen.getByText('ничего не делать · 52,56')).toBeInTheDocument();
    expect(screen.getByText('вы здесь · 56,54')).toBeInTheDocument();
  });
  it('does not hold up the numeric review while the analyst is still working', async () => {
    vi.mocked(analyzePlan).mockImplementation(() => new Promise(() => {}));
    render(
      <ReviewPage
        scenario={scenario}
        plan={scenario.examples.strong}
        onApply={vi.fn()}
        onRegistry={vi.fn()}
      />,
    );
    await waitFor(() =>
      expect(
        screen.getByRole('region', { name: 'Результат плана' }),
      ).toHaveTextContent('56,54'),
    );
    expect(screen.getByRole('status')).toHaveTextContent('аналитик проверяет');
  });
});
