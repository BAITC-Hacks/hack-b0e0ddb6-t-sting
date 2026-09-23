import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { validatePlan } from '../../src/api/simulation';
import { Builder } from '../../src/features/builder/Builder';
import { Catalog } from '../../src/features/builder/Catalog';
import { MeasureDialog } from '../../src/features/builder/MeasureDialog';
import { PlanPanel } from '../../src/features/builder/PlanPanel';
import { emptyValidation, scenario, valid } from '../fixtures/scenario';
vi.mock('../../src/api/simulation', () => ({ validatePlan: vi.fn() }));
beforeEach(() => {
  vi.mocked(validatePlan).mockReset();
});
describe('plan rules', () => {
  it('shows pending checks, a useful failure and retry, then server budget and violations', async () => {
    vi.mocked(validatePlan)
      .mockRejectedValueOnce(new Error('Соединение потеряно'))
      .mockResolvedValueOnce(emptyValidation);
    render(
      <PlanPanel
        scenario={scenario}
        plan={[]}
        onChange={vi.fn()}
        onReview={vi.fn()}
      />,
    );
    expect(
      screen.getByRole('button', { name: 'разобрать партию' }),
    ).toBeDisabled();
    expect(screen.getByRole('status')).toHaveTextContent('проверяем бюджет');
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Соединение потеряно',
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'повторить попытку ↻' }),
    );
    expect(
      await screen.findByText('Выберите ровно 5 мер.'),
    ).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '0');
    expect(screen.getByRole('button', { name: 'очистить' })).toBeDisabled();
  });
  it('uses server budget and displays direction, conflict and cost failures', async () => {
    vi.mocked(validatePlan).mockResolvedValue({
      ...valid,
      cost: 123,
      remaining: -23,
      violations: [
        {
          code: 'DIRECTION_LIMIT',
          message: 'Слишком много мер одного направления.',
          measureIds: ['M1'],
        },
        {
          code: 'INCOMPATIBLE',
          message: 'Меры несовместимы.',
          measureIds: ['M1', 'M3'],
        },
        {
          code: 'BUDGET_EXCEEDED',
          message: 'Бюджет превышен.',
          measureIds: [],
        },
      ],
    });
    render(
      <PlanPanel
        scenario={scenario}
        plan={scenario.examples.strong}
        onChange={vi.fn()}
        onReview={vi.fn()}
      />,
    );
    expect(await screen.findByText('Бюджет превышен.')).toBeInTheDocument();
    expect(
      screen.getByText('Слишком много мер одного направления.'),
    ).toBeInTheDocument();
    expect(screen.getByText('Меры несовместимы.')).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('value', '123');
    expect(
      screen.getByRole('button', { name: 'разобрать партию' }),
    ).toBeDisabled();
  });
  it('allows valid review, removing measures, loading examples and clearing', async () => {
    vi.mocked(validatePlan).mockResolvedValue(valid);
    const change = vi.fn();
    const review = vi.fn();
    render(
      <PlanPanel
        scenario={scenario}
        plan={scenario.examples.strong}
        onChange={change}
        onReview={review}
      />,
    );
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: 'разобрать партию' }),
      ).toBeEnabled(),
    );
    fireEvent.click(screen.getByRole('button', { name: 'разобрать партию' }));
    expect(review).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole('button', { name: 'Удалить M7' }));
    expect(change).toHaveBeenLastCalledWith(scenario.examples.strong.slice(1));
    fireEvent.click(screen.getByRole('button', { name: 'пример плана' }));
    expect(change).toHaveBeenLastCalledWith(scenario.examples.strong);
    fireEvent.click(screen.getByRole('button', { name: 'план-ловушка' }));
    expect(change).toHaveBeenLastCalledWith(scenario.examples.trap);
    fireEvent.click(screen.getByRole('button', { name: 'очистить' }));
    expect(change).toHaveBeenLastCalledWith([]);
    fireEvent.click(screen.getByText('правила сценария'));
    expect(
      screen.getByText('Порядок решений не влияет на результат.'),
    ).toBeVisible();
  });
});
describe('measure catalog', () => {
  it('filters by direction and case-insensitive text, showing empty results', () => {
    render(
      <Catalog
        scenario={scenario}
        plan={scenario.examples.strong}
        onAdd={vi.fn()}
      />,
    );
    expect(screen.getByRole('button', { name: /M7 Школа/ })).toBeDisabled();
    expect(
      screen.getByRole('button', { name: /M1 Выделенные/ }),
    ).toBeDisabled();
    fireEvent.change(screen.getByRole('combobox'), {
      target: { value: 'transport' },
    });
    expect(
      screen.queryByRole('button', { name: /M7 Школа/ }),
    ).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'лрт' } });
    expect(
      screen.getByRole('button', { name: 'M3 Линия ЛРТ / расширение' }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /M1 Выделенные/ }),
    ).not.toBeInTheDocument();
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'несуществующая' },
    });
    expect(
      screen.getByText('Меры не найдены. Измените поиск или направление.'),
    ).toBeInTheDocument();
  });
  it('opens details, requires a district and adds the selected measure', async () => {
    vi.mocked(validatePlan).mockResolvedValue(emptyValidation);
    const change = vi.fn();
    render(
      <Builder
        scenario={scenario}
        plan={[]}
        onChange={change}
        onReview={vi.fn()}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: /M7 Школа/ }));
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('+16')).toBeInTheDocument();
    expect(
      within(dialog).getByRole('button', { name: 'добавить меру →' }),
    ).toBeDisabled();
    fireEvent.click(within(dialog).getByRole('radio', { name: /Нура/ }));
    fireEvent.click(
      within(dialog).getByRole('button', { name: 'добавить меру →' }),
    );
    expect(change).toHaveBeenCalledWith([
      { measureId: 'M7', districtId: 'nura' },
    ]);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    await screen.findByText('Выберите ровно 5 мер.');
  });
  it('adds citywide measures without a district picker', () => {
    const add = vi.fn();
    render(<Catalog scenario={scenario} plan={[]} onAdd={add} />);
    fireEvent.click(screen.getByRole('button', { name: /M12 Единая/ }));
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'добавить меру →' }));
    expect(add).toHaveBeenCalledWith({ measureId: 'M12' });
  });
  it('shows negative side effects before committing a district measure', () => {
    render(
      <MeasureDialog
        measure={scenario.measures[10]}
        scenario={scenario}
        onAdd={vi.fn()}
        onClose={vi.fn()}
      />,
    );
    expect(screen.getByText('-2')).toHaveClass('danger');
    expect(screen.getByText('+12')).toHaveClass('positive');
  });
});
