import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { councilEvents, getCouncilSession } from '../../../src/api/council';
import { CouncilPage } from '../../../src/features/council/CouncilPage';
import { scenario } from '../../fixtures/scenario';
import { amendment, events, opened, snapshot, speech } from './fixtures';

vi.mock('../../../src/api/council', () => ({
  councilEvents: vi.fn(),
  getCouncilSession: vi.fn(),
  parseCouncilEvent: (data: string) => JSON.parse(data),
}));

beforeEach(() => {
  vi.mocked(getCouncilSession).mockReset().mockResolvedValue(snapshot());
  vi.mocked(councilEvents).mockReset();
});

describe('council page', () => {
  it('replays a saved session, shows verified sources and applies the exact engine plan', async () => {
    const apply = vi.fn();
    render(
      <CouncilPage
        sessionId="session-1"
        scenario={scenario}
        onBack={vi.fn()}
        onApply={apply}
      />,
    );
    expect(await screen.findByText('Экология возражает.')).toBeInTheDocument();
    expect(screen.getByText('раунд 1 · шаблон')).toBeInTheDocument();
    expect(
      screen.getByText('✓ цифры подтверждены движком'),
    ).toBeInTheDocument();
    expect(screen.getByText('Score 56,54')).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'показать на карте ↗' }),
    );
    expect(
      screen.getByRole('region', { name: 'Поправки на карте' }),
    ).toHaveTextContent('M5 Сарыарка → M3 Нура');
    fireEvent.click(screen.getByRole('button', { name: 'принять поправку →' }));
    expect(apply).toHaveBeenCalledWith(amendment.plan);
  });

  it('shows rejected package checks and applies only a validated recommendation', async () => {
    const protocol = {
      source: 'offline' as const,
      verified: true,
      decision: 'amend' as const,
      recommendedAmendmentIds: ['a1'],
      plan: amendment.plan,
      score: 57.21,
      cost: 100,
      compromises: [
        { amendmentId: 'a1', scoreCost: 0.44, text: 'Цена экологии' },
      ],
      dissent: [{ roleId: 'ecology' as const, text: 'Особое мнение' }],
      summary: 'Рекомендуем ЛРТ в Нуре.',
    };
    vi.mocked(getCouncilSession).mockResolvedValue(
      snapshot([
        ...events,
        {
          type: 'package-check',
          amendmentIds: ['a1', 'a2'],
          valid: false,
          reason: '104 > 100',
        },
        {
          type: 'package-check',
          amendmentIds: ['a1'],
          valid: true,
          score: 57.21,
          cost: 100,
        },
        {
          type: 'votes',
          votes: [{ roleId: 'ecology', vote: 'against', delta: -0.16 }],
        },
        { type: 'protocol', protocol },
        { type: 'closed' },
      ]),
    );
    const apply = vi.fn();
    render(
      <CouncilPage
        sessionId="session-1"
        scenario={scenario}
        onBack={vi.fn()}
        onApply={apply}
      />,
    );
    const checks = await screen.findByRole('region', {
      name: 'Проверка пакетов',
    });
    expect(await within(checks).findByText('104 > 100')).toBeInTheDocument();
    expect(
      screen.getByRole('region', { name: 'Голосование' }),
    ).toHaveTextContent('0 за / 0 воздержались / 1 против');
    expect(
      screen.getByRole('region', { name: 'Протокол заседания' }),
    ).toHaveTextContent('Цена экологии · цена 0,44 балла');
    fireEvent.click(screen.getByRole('button', { name: 'принять пакет →' }));
    expect(apply).toHaveBeenCalledWith(protocol.plan);
  });

  it('retries a failed session load and offers a return path', async () => {
    vi.mocked(getCouncilSession)
      .mockRejectedValueOnce(new Error('Заседание не найдено'))
      .mockResolvedValueOnce(snapshot());
    const back = vi.fn();
    render(
      <CouncilPage
        sessionId="session-1"
        scenario={scenario}
        onBack={back}
        onApply={vi.fn()}
      />,
    );
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Заседание не найдено',
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'обновить заседание ↻' }),
    );
    await waitFor(() =>
      expect(screen.queryByRole('alert')).not.toBeInTheDocument(),
    );
    fireEvent.click(screen.getByRole('button', { name: '← к результатам' }));
    expect(back).toHaveBeenCalledOnce();
  });

  it('shows a round-two objection once when the speech repeats the same text', async () => {
    vi.mocked(getCouncilSession).mockResolvedValue(
      snapshot([
        opened,
        {
          type: 'objection',
          roleId: 'ecology',
          amendmentId: 'a1',
          text: 'Экология возражает.',
        },
        { ...speech, round: 2 },
      ]),
    );
    render(
      <CouncilPage
        sessionId="session-1"
        scenario={scenario}
        onBack={vi.fn()}
        onApply={vi.fn()}
      />,
    );
    expect(await screen.findAllByText('Экология возражает.')).toHaveLength(1);
    expect(screen.getByText('раунд 2 · шаблон')).toBeInTheDocument();
  });

  it('highlights affected districts when a member objects to the chosen amendment', async () => {
    vi.mocked(getCouncilSession).mockResolvedValue(
      snapshot([
        ...events,
        {
          type: 'objection',
          roleId: 'ecology',
          amendmentId: 'a1',
          text: 'Экология теряет запас.',
        },
      ]),
    );
    render(
      <CouncilPage
        sessionId="session-1"
        scenario={scenario}
        onBack={vi.fn()}
        onApply={vi.fn()}
      />,
    );
    const map = await screen.findByRole('region', {
      name: 'Поправки на карте',
    });
    expect(
      within(map).getByLabelText('Возражения по поправке'),
    ).toHaveTextContent('Заместитель по экологии: Экология теряет запас.');
    expect(
      within(map).getByLabelText('Возражения по поправке'),
    ).toHaveTextContent('Сарыарка / Нура');
    expect(map.querySelectorAll('.map-contested')).toHaveLength(2);
  });

  it('orders competing amendments by score gain and navigates the meeting stages', async () => {
    const smaller = {
      ...amendment,
      id: 'small',
      delta: 0.1,
      scoreAfter: 56.64,
    };
    vi.mocked(getCouncilSession).mockResolvedValue(
      snapshot([{ type: 'amendment', amendment: smaller }, ...events]),
    );
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    render(
      <CouncilPage
        sessionId="session-1"
        scenario={scenario}
        onBack={vi.fn()}
        onApply={vi.fn()}
      />,
    );
    const board = await screen.findByRole('region', { name: 'Поправки' });
    expect(within(board).getAllByText(/Score 5/)[0]).toHaveTextContent('57,21');
    const nav = screen.getByRole('navigation', { name: 'Ход заседания' });
    for (const label of [
      'подготовка',
      'раунд 1',
      'поправки',
      'спор',
      'пакеты',
      'голосование',
      'протокол',
    ]) {
      fireEvent.click(
        within(nav).getByRole('button', { name: new RegExp(label) }),
      );
    }
    expect(scroll).toHaveBeenCalledTimes(7);
  });
});
