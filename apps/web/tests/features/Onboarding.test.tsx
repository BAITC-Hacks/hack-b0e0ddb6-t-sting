import { fireEvent, render, screen, within } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { Onboarding } from '../../src/features/onboarding/Onboarding';

function goTo(name: string) {
  fireEvent.click(screen.getByRole('button', { name }));
}

it('walks all seven steps, announces the active heading, and returns to the constructor', () => {
  const close = vi.fn();
  render(<Onboarding onClose={close} />);
  const titles = [
    'Симулятор плана развития города',
    'Город: 5 районов, 10 показателей',
    'Правила плана',
    'Лаг: долгие проекты работают меньше',
    'Как считается итоговый балл',
    'Что на самом деле двигает балл',
    'Что вы увидите после симуляции',
  ];
  for (const [index, title] of titles.entries()) {
    expect(screen.getByRole('dialog')).toHaveAccessibleName(
      `как это работает · ${index + 1} / 7`,
    );
    expect(screen.getByRole('heading', { name: title })).toHaveFocus();
    if (index < 6) goTo('далее →');
  }
  goTo('назад');
  expect(screen.getByRole('heading', { name: titles[5] })).toHaveFocus();
  goTo('далее →');
  goTo('собрать план →');
  expect(close).toHaveBeenCalledOnce();
});

it('explains the engine, critical indicators, plan constraints and score formula', () => {
  render(<Onboarding onClose={vi.fn()} />);
  expect(screen.getByText(/ИИ ничего не считает/)).toBeInTheDocument();
  expect(
    screen.getByRole('list', { name: 'От плана к объяснению' }),
  ).toHaveTextContent('5 мер из 14');
  goTo('Шаг 2: Город');
  expect(screen.getByRole('img')).toHaveAccessibleName(
    'Схема районов: в Нуре два провала — школы 38 и поликлиники 35',
  );
  goTo('Шаг 3: Правила');
  expect(
    screen.getByRole('list', { name: 'Пример проверки плана' }),
  ).toHaveTextContent('автобусные полосы + ЛРТзапрещено');
  goTo('Шаг 5: Итоговый балл');
  expect(screen.getByText('52.56')).toBeInTheDocument();
  expect(screen.getByText(/30% оценки зависит/)).toBeInTheDocument();
});

it.each([
  [0, '8 из 8 кварталов', '+16 × 8/8 = +16', '38 → 54'],
  [1, '7 из 8 кварталов', '+16 × 7/8 = +14', '38 → 52'],
  [2, '6 из 8 кварталов', '+16 × 6/8 = +12', '38 → 50'],
  [3, '5 из 8 кварталов', '+16 × 5/8 = +10', '38 → 48'],
  [4, '4 из 8 кварталов', '+16 × 4/8 = +8', '38 → 46'],
])(
  'recalculates the illustrative school effect for lag %i',
  (lag, duration, effect, schools) => {
    render(<Onboarding onClose={vi.fn()} />);
    goTo('Шаг 4: Лаг');
    const button = within(
      screen.getByRole('group', { name: 'Лаг в кварталах' }),
    ).getByRole('button', { name: String(lag) });
    fireEvent.click(button);
    expect(button).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(duration)).toBeInTheDocument();
    expect(screen.getByText(effect)).toBeInTheDocument();
    expect(screen.getByText(schools)).toBeInTheDocument();
    const quarters = within(
      screen.getByRole('list', { name: 'Восемь кварталов' }),
    ).getAllByRole('listitem');
    expect(quarters).toHaveLength(8);
    expect(
      quarters.filter((quarter) => quarter.textContent?.includes('строится')),
    ).toHaveLength(lag);
    expect(
      screen.getByText(
        lag === 3 ? 'лаг школы — 3' : 'для примера: у школы лаг 3',
      ),
    ).toBeInTheDocument();
  },
);

it('switches between the positive school and negative crossing examples', () => {
  render(<Onboarding onClose={vi.fn()} />);
  goTo('Шаг 6: Примеры');
  expect(screen.getByText('≈ +1.45')).toBeInTheDocument();
  expect(screen.getByText('+0.12')).toBeInTheDocument();
  expect(screen.getByText('+0.33')).toBeInTheDocument();
  expect(screen.getByText('+1.00')).toBeInTheDocument();
  goTo('переходы · Алматы');
  expect(screen.getByText('38.25')).toBeInTheDocument();
  expect(screen.getByText('штраф −1')).toBeInTheDocument();
  expect(screen.getByText('−0.87')).toBeInTheDocument();
  expect(screen.queryByText('≈ +1.45')).not.toBeInTheDocument();
  goTo('школа · Нура');
  expect(screen.getByText('≈ +1.45')).toBeInTheDocument();
});

it('expands and collapses the glossary without losing navigation or examples', () => {
  render(<Onboarding onClose={vi.fn()} />);
  goTo('Шаг 4: Лаг');
  goTo('0');
  goTo('Шаг 7: Результаты');
  expect(screen.getByText('+3.99')).toBeInTheDocument();
  expect(screen.queryByText('процентиль')).not.toBeInTheDocument();
  goTo('подробнее: термины');
  expect(
    screen.getByRole('button', { name: 'скрыть термины' }),
  ).toHaveAttribute('aria-expanded', 'true');
  for (const term of [
    'процентиль',
    'КПД',
    'вклад меры',
    'оценка меры',
    'синергия',
  ]) {
    expect(screen.getByText(term, { exact: true })).toBeInTheDocument();
  }
  expect(screen.getByText(/из \+4.68 ≈ 85%/)).toBeInTheDocument();
  goTo('скрыть термины');
  expect(screen.queryByText('процентиль')).not.toBeInTheDocument();
  goTo('Шаг 4: Лаг');
  expect(screen.getByText('38 → 54')).toBeInTheDocument();
});
