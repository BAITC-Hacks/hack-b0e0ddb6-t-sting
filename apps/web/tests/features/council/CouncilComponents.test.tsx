import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { CouncilEvent } from '../../../../api/src/council/types';
import { AmendmentBoard } from '../../../src/features/council/AmendmentBoard';
import { CouncilMap } from '../../../src/features/council/CouncilMap';
import { CouncilTable } from '../../../src/features/council/CouncilTable';
import { SpeechFeed } from '../../../src/features/council/SpeechFeed';
import { scenario } from '../../fixtures/scenario';
import { amendment, members, opened, speech } from './fixtures';

describe('council component states', () => {
  it('shows an empty amendment state and lets a user inspect and apply a recommendation', () => {
    const select = vi.fn();
    const apply = vi.fn();
    const { rerender } = render(
      <AmendmentBoard
        amendments={[]}
        members={members}
        scenario={scenario}
        recommendedIds={[]}
        onSelect={select}
        onApply={apply}
      />,
    );
    expect(
      screen.getByText('Поправки появятся после выступлений.'),
    ).toBeInTheDocument();
    rerender(
      <AmendmentBoard
        amendments={[amendment]}
        members={members}
        scenario={scenario}
        recommendedIds={['a1']}
        onSelect={select}
        onApply={apply}
      />,
    );
    expect(screen.getByText('рекомендовано')).toBeInTheDocument();
    expect(screen.getByText('+0,66')).toBeInTheDocument();
    expect(
      screen.getByTitle('Заместитель по экологии: 9,1 → 8,94'),
    ).toHaveTextContent('-0,16');
    fireEvent.click(
      screen.getByRole('button', { name: 'показать на карте ↗' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'принять поправку →' }));
    expect(select).toHaveBeenCalledWith(amendment);
    expect(apply).toHaveBeenCalledWith(amendment);
  });

  it('keeps adverse impacts and an unknown role readable in a saved amendment', () => {
    const adverse = {
      ...amendment,
      id: 'a2',
      delta: -0.2,
      impacts: [
        { roleId: 'finance' as const, before: 1, after: 0, delta: -1 },
        { roleId: 'ecology' as const, before: 1, after: 8, delta: 7 },
      ],
    };
    render(
      <AmendmentBoard
        amendments={[adverse]}
        members={members}
        scenario={scenario}
        recommendedIds={[]}
        onSelect={vi.fn()}
        onApply={vi.fn()}
      />,
    );
    expect(screen.getByText('-0,2')).toHaveClass('danger');
    expect(screen.getByTitle('finance: 1 → 0')).toHaveTextContent('finance');
    expect(
      screen.getByTitle('Заместитель по экологии: 1 → 8'),
    ).toHaveTextContent('+7');
  });

  it('maps local and citywide objections without assuming which district loses', () => {
    const objection: Extract<CouncilEvent, { type: 'objection' }> = {
      type: 'objection',
      roleId: 'ecology',
      amendmentId: 'a1',
      text: 'Экология возражает.',
    };
    const { rerender } = render(
      <CouncilMap
        scenario={scenario}
        amendment={null}
        objections={[]}
        members={members}
      />,
    );
    expect(
      screen.getByText('Выберите поправку, чтобы увидеть затронутые районы.'),
    ).toBeInTheDocument();
    rerender(
      <CouncilMap
        scenario={scenario}
        amendment={amendment}
        objections={[objection]}
        members={members}
      />,
    );
    expect(screen.getByLabelText('Возражения по поправке')).toHaveTextContent(
      'Сарыарка / Нура',
    );
    expect(
      screen
        .getByRole('img', { name: 'Схематичная карта затронутых районов' })
        .querySelectorAll('.map-contested'),
    ).toHaveLength(2);
    const citywide = {
      ...amendment,
      replace: { measureId: 'M12' as const },
      with: { measureId: 'M14' as const },
      id: 'city',
    };
    rerender(
      <CouncilMap
        scenario={scenario}
        amendment={citywide}
        objections={[{ ...objection, amendmentId: 'city', roleId: 'finance' }]}
        members={members}
      />,
    );
    expect(screen.getByLabelText('Возражения по поправке')).toHaveTextContent(
      'весь город',
    );
    expect(
      screen
        .getByRole('img', { name: 'Схематичная карта затронутых районов' })
        .querySelectorAll('.map-contested'),
    ).toHaveLength(scenario.districts.length);
    expect(screen.getByLabelText('Возражения по поправке')).toHaveTextContent(
      'finance',
    );
    const localToCity = {
      ...amendment,
      with: { measureId: 'M14' as const },
      id: 'wide',
    };
    rerender(
      <CouncilMap
        scenario={scenario}
        amendment={localToCity}
        objections={[{ ...objection, amendmentId: 'wide' }]}
        members={members}
      />,
    );
    expect(screen.getByLabelText('Возражения по поправке')).toHaveTextContent(
      'Сарыарка / весь город',
    );
    expect(
      screen
        .getByRole('img', { name: 'Схематичная карта затронутых районов' })
        .querySelectorAll('.map-contested'),
    ).toHaveLength(scenario.districts.length);
    rerender(
      <CouncilMap
        scenario={scenario}
        amendment={amendment}
        objections={[]}
        members={members}
      />,
    );
    expect(
      screen.queryByLabelText('Возражения по поправке'),
    ).not.toBeInTheDocument();
    rerender(
      <CouncilMap
        scenario={{
          ...scenario,
          districts: scenario.districts.filter((entry) => entry.id !== 'nura'),
        }}
        amendment={amendment}
        objections={[]}
        members={members}
      />,
    );
    expect(
      screen.getByRole('region', { name: 'Поправки на карте' }),
    ).toHaveTextContent('M3 nura');
  });

  it('renders source, stance and verification for speeches while hiding duplicate objections', () => {
    const round2 = {
      ...speech,
      round: 2 as const,
      source: 'llm' as const,
      verified: false,
      stance: 'conditional' as const,
      amendmentId: null,
    };
    const objection: Extract<CouncilEvent, { type: 'objection' }> = {
      type: 'objection',
      roleId: 'ecology',
      amendmentId: 'a1',
      text: speech.text,
    };
    const { rerender } = render(
      <SpeechFeed
        events={[]}
        members={members}
        amendments={[]}
        scenario={scenario}
      />,
    );
    expect(
      screen.getByText('Участники готовят выступления…'),
    ).toBeInTheDocument();
    rerender(
      <SpeechFeed
        events={[speech, objection, round2, { type: 'closed' }]}
        members={members}
        amendments={[amendment]}
        scenario={scenario}
      />,
    );
    expect(screen.getAllByText(speech.text)).toHaveLength(2);
    expect(screen.getByText('раунд 2 · AI')).toBeInTheDocument();
    expect(
      screen.getByText('поправка M5 · Сарыарка → M3 · Нура'),
    ).toBeInTheDocument();
    expect(screen.getByText('условно')).toBeInTheDocument();
    expect(screen.getAllByText('✓ цифры подтверждены движком')).toHaveLength(1);
    rerender(
      <SpeechFeed
        events={[
          {
            ...speech,
            amendmentId: 'unknown',
            roleId: 'finance',
            stance: 'for',
          },
        ]}
        members={members}
        amendments={[]}
        scenario={scenario}
      />,
    );
    expect(screen.getByText('finance')).toBeInTheDocument();
    expect(screen.getByText('поправка unknown')).toBeInTheDocument();
    expect(screen.getByText('за')).toBeInTheDocument();
  });

  it('shows the latest speaker and the three deterministic vote outcomes', () => {
    const votes: CouncilEvent = {
      type: 'votes',
      votes: [
        { roleId: 'ecology', vote: 'against', delta: -0.16 },
        { roleId: 'transport', vote: 'for', delta: 0.29 },
        { roleId: 'finance', vote: 'abstain', delta: -0.05 },
      ],
    };
    const extra = [
      {
        id: 'transport' as const,
        title: 'Транспорт',
        emoji: '🚌',
        metric: 'T',
        character: 'pragmatic',
      },
      {
        id: 'finance' as const,
        title: 'Финансы',
        emoji: '💰',
        metric: 'budget',
        character: 'careful',
      },
    ];
    render(
      <CouncilTable
        members={[...members, ...extra]}
        events={[opened, speech, votes]}
      />,
    );
    const roster = screen.getByRole('region', { name: 'Состав совета' });
    expect(within(roster).getByText('✕ против')).toBeInTheDocument();
    expect(within(roster).getByText('✓ за')).toBeInTheDocument();
    expect(within(roster).getByText('— воздержался')).toBeInTheDocument();
    expect(roster.querySelector('.council-seat.active')).toHaveTextContent(
      'ЭКО',
    );
    expect(
      screen.getByText('персонажи вымышленные · только должности'),
    ).toBeInTheDocument();
  });
});
