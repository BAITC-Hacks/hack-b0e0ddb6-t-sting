import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CouncilEvent, Protocol } from '../../../../api/src/council/types';
import { ProtocolPanel } from '../../../src/features/council/ProtocolPanel';
import { scenario } from '../../fixtures/scenario';
import { amendment, members, plan } from './fixtures';

const protocol: Protocol = {
  decision: 'amend',
  recommendedAmendmentIds: ['a1'],
  plan: amendment.plan,
  score: 57.21,
  cost: 100,
  source: 'offline',
  verified: true,
  summary: 'Подтверждённый пакет.',
  compromises: [],
  dissent: [],
};
const checked: CouncilEvent = {
  type: 'package-check',
  amendmentIds: ['a1'],
  valid: true,
  score: 57.21,
  cost: 100,
};
function show(events: CouncilEvent[], value?: Protocol) {
  const onApply = vi.fn();
  render(
    <ProtocolPanel
      events={
        value ? [...events, { type: 'protocol', protocol: value }] : events
      }
      members={members}
      amendments={[amendment]}
      scenario={scenario}
      onApply={onApply}
    />,
  );
  return onApply;
}

describe('council protocol presentation', () => {
  it('shows the waiting state without exposing an apply action', () => {
    show([]);
    expect(
      screen.getByRole('region', { name: 'Проверка пакетов' }),
    ).toHaveTextContent('ещё не проверял');
    expect(
      screen.queryByRole('region', { name: 'Голосование' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('region', { name: 'Протокол заседания' }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('shows rejected costs, reasons and human-readable amendment names', () => {
    show([
      {
        type: 'package-check',
        amendmentIds: ['a1', 'unknown-id'],
        valid: false,
        reason: 'Бюджет превышен',
        cost: 104,
      },
      { type: 'package-check', amendmentIds: [], valid: false },
      { type: 'package-check', amendmentIds: [], valid: true },
    ]);
    const log = screen.getByRole('region', { name: 'Проверка пакетов' });
    expect(log).toHaveTextContent('Бюджет превышен · стоимость 104 / 100');
    expect(log).toHaveTextContent('M5 · Сарыарка → M3 · Нура + unknown-id');
    expect(log).toHaveTextContent('Пакет не прошёл проверку');
    expect(log).toHaveTextContent('исходный план');
    expect(log).toHaveTextContent('Score — · стоимость —');
    expect(log).toHaveTextContent('3 попыток');
  });

  it('applies the exact verified plan selected by the protocol', () => {
    const onApply = show([checked], protocol);
    const panel = screen.getByRole('region', { name: 'Протокол заседания' });
    expect(panel).toHaveTextContent('шаблон · проверено движком');
    expect(panel).toHaveTextContent('принять с поправками');
    expect(panel).toHaveTextContent('Score 57,21');
    expect(panel).toHaveTextContent('M3 · Нура');
    fireEvent.click(
      within(panel).getByRole('button', { name: 'принять пакет →' }),
    );
    expect(onApply).toHaveBeenCalledExactlyOnceWith(amendment.plan);
  });

  it.each([
    [],
    [{ ...checked, valid: false }],
    [{ ...checked, amendmentIds: ['a1', 'a2'] }],
    [{ ...checked, amendmentIds: ['a2'] }],
  ])(
    'withholds apply when no successful check matches the recommendation',
    (...checks) => {
      show(checks as CouncilEvent[], protocol);
      expect(
        screen.queryByRole('button', { name: 'принять пакет →' }),
      ).not.toBeInTheDocument();
    },
  );

  it('withholds apply for an unverified protocol even if a package succeeded', () => {
    show([checked], {
      ...protocol,
      source: 'llm',
      verified: false,
      decision: 'revise',
    });
    expect(
      screen.getByRole('region', { name: 'Протокол заседания' }),
    ).toHaveTextContent('AI · ожидает проверки');
    expect(
      screen.getByRole('region', { name: 'Протокол заседания' }),
    ).toHaveTextContent('доработать');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('can accept the original plan after the empty package is checked', () => {
    const onApply = show(
      [
        {
          type: 'package-check',
          amendmentIds: [],
          valid: true,
          score: 56.54,
          cost: 95,
        },
      ],
      {
        ...protocol,
        decision: 'accept',
        recommendedAmendmentIds: [],
        plan,
        score: 56.54,
        cost: 95,
      },
    );
    const panel = screen.getByRole('region', { name: 'Протокол заседания' });
    expect(panel).toHaveTextContent('принять план');
    expect(panel).not.toHaveTextContent('Пакет:');
    fireEvent.click(within(panel).getByRole('button'));
    expect(onApply).toHaveBeenCalledWith(plan);
  });

  it('renders vote counts, all stances and small finance gains without losing precision', () => {
    show([
      {
        type: 'votes',
        votes: [
          { roleId: 'ecology', vote: 'against', delta: -0.157 },
          { roleId: 'services', vote: 'abstain', delta: -0.05 },
          { roleId: 'finance', vote: 'for', delta: 0.045 },
          { roleId: 'social', vote: 'for', delta: 0 },
        ],
      },
    ]);
    const voting = screen.getByRole('region', { name: 'Голосование' });
    expect(voting).toHaveTextContent('2 за / 1 воздержались / 1 против');
    expect(voting).toHaveTextContent('Заместитель по экологии');
    expect(voting).toHaveTextContent('против · -0,157');
    expect(voting).toHaveTextContent('воздержался · -0,05');
    expect(voting).toHaveTextContent('financeза · +0,045');
    expect(voting).toHaveTextContent('socialза · 0');
  });

  it('presents compromise prices and dissent with member-name fallback', () => {
    show([checked], {
      ...protocol,
      compromises: [
        {
          amendmentId: 'a2',
          scoreCost: 0.44,
          text: 'Сохранить экологическую метрику.',
        },
      ],
      dissent: [
        { roleId: 'ecology', text: 'Потеря метрики.' },
        { roleId: 'finance', text: 'Учесть бюджет.' },
      ],
    });
    const panel = screen.getByRole('region', { name: 'Протокол заседания' });
    expect(panel).toHaveTextContent(
      'Сохранить экологическую метрику. · цена 0,44 балла',
    );
    expect(panel).toHaveTextContent('Заместитель по экологии: Потеря метрики.');
    expect(panel).toHaveTextContent('finance: Учесть бюджет.');
  });
});
