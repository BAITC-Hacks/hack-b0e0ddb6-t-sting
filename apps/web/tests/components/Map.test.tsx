import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DistrictHeatmap } from '../../src/components/DistrictHeatmap';
import { number, signed, itemLabel } from '../../src/components/format';
import { scenario, review } from '../fixtures/scenario';
describe('district map', () => {
  it('shows server values, critical districts and accessible district selection', () => {
    render(<DistrictHeatmap scenario={scenario} plan={[]} />);
    expect(screen.getByText('S1 38 · S2 35')).toBeInTheDocument();
    const nura = screen.getByRole('button', { name: 'Выбрать район Нура' });
    fireEvent.click(nura);
    expect(nura).toHaveAttribute('aria-pressed', 'true');
    expect(
      screen.getByText('Главный аутсайдер по соцсфере и транспорту.'),
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Скрыть район' }));
    expect(nura).toHaveAttribute('aria-pressed', 'false');
    fireEvent.keyDown(nura, { key: 'x' });
    expect(nura).toHaveAttribute('aria-pressed', 'false');
    fireEvent.keyDown(nura, { key: 'Enter' });
    expect(nura).toHaveAttribute('aria-pressed', 'true');
    const yesil = screen.getByRole('button', { name: 'Выбрать район Есиль' });
    fireEvent.keyDown(yesil, { key: ' ' });
    expect(yesil).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(screen.getByRole('button', { name: 'Алматы' }));
    expect(screen.getByText('Старый ЖКХ и пробки.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'балл D' }));
    expect(screen.getByText('D 49,96')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'T' }));
    expect(screen.getByText('T1 55 · T2 40')).toBeInTheDocument();
    fireEvent.click(screen.getByText('все показатели · 5 районов × 10'));
    expect(screen.getByRole('columnheader', { name: 'S1' })).toHaveAttribute(
      'title',
      'Школы и детсады · вес 0.11',
    );
  });
  it('switches between server baseline and evaluated indicators and shows plan overlays', () => {
    const { container } = render(
      <DistrictHeatmap
        scenario={scenario}
        plan={scenario.examples.strong}
        evaluation={review.evaluation}
        comparison
      />,
    );
    expect(container.querySelector('.city-outline')).toBeInTheDocument();
    const nura = screen.getByRole('button', { name: 'Выбрать район Нура' });
    expect(nura).toHaveClass('improved');
    expect(within(nura).getByText('M7 · M8 · M10')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'до' }));
    expect(nura).toHaveClass('critical');
    expect(screen.getByRole('button', { name: 'до' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    fireEvent.click(screen.getByRole('button', { name: 'после' }));
    expect(nura).toHaveClass('improved');
    fireEvent.click(screen.getByText('все показатели · 5 районов × 10'));
    expect(screen.getByText('43,75')).toBeInTheDocument();
  });
});
describe('display formatting', () => {
  it('formats known numbers and identifies district and city plans', () => {
    expect(number(1234.567)).toBe('1 234,57');
    expect(signed(1.2)).toBe('+1,2');
    expect(signed(-0.5)).toBe('-0,5');
    expect(signed(0)).toBe('0');
    expect(itemLabel({ measureId: 'M7', districtId: 'nura' }, scenario)).toBe(
      'M7 · Нура',
    );
    expect(itemLabel({ measureId: 'M12' }, scenario)).toBe('M12 · весь город');
  });
});
