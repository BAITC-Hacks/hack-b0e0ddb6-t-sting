import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { App } from '../../../src/App';
import { checkHealth } from '../../../src/api/health';
import {
  analyzePlan,
  getScenario,
  reviewPlan,
  validatePlan,
} from '../../../src/api/simulation';
import {
  createCouncilSession,
  getCouncilSession,
} from '../../../src/api/council';
import type {
  CouncilSession,
  Protocol,
} from '../../../../api/src/council/types';
import {
  analysis,
  emptyValidation,
  review,
  scenario,
  valid,
} from '../../fixtures/scenario';

vi.mock('../../../src/api/health', () => ({ checkHealth: vi.fn() }));
vi.mock('../../../src/api/simulation', () => ({
  getScenario: vi.fn(),
  validatePlan: vi.fn(),
  reviewPlan: vi.fn(),
  analyzePlan: vi.fn(),
}));
vi.mock('../../../src/api/council', () => ({
  createCouncilSession: vi.fn(),
  getCouncilSession: vi.fn(),
}));
const improved = [
  ...scenario.examples.strong.slice(0, 4),
  { measureId: 'M3', districtId: 'nura' },
] as typeof scenario.examples.strong;
const protocol: Protocol = {
  decision: 'amend',
  recommendedAmendmentIds: ['lrt-nura'],
  plan: improved,
  score: 57.20556,
  cost: 100,
  compromises: [],
  dissent: [],
  summary: 'Проверенная поправка ЛРТ.',
  source: 'offline',
  verified: true,
};
const session: CouncilSession = {
  id: 'saved-session',
  plan: scenario.examples.strong,
  status: 'closed',
  createdAt: '2026-09-23T10:00:00Z',
  protocol,
  events: [
    {
      type: 'opened',
      plan: scenario.examples.strong,
      score: 56.54307,
      members: [],
    },
    {
      type: 'package-check',
      amendmentIds: ['lrt-nura'],
      valid: true,
      score: 57.20556,
      cost: 100,
    },
    { type: 'protocol', protocol },
    { type: 'closed' },
  ],
};
beforeEach(() => {
  localStorage.clear();
  vi.mocked(checkHealth).mockReset().mockResolvedValue();
  vi.mocked(getScenario).mockReset().mockResolvedValue(scenario);
  vi.mocked(validatePlan)
    .mockReset()
    .mockImplementation(async (plan) =>
      plan.length === 5 ? valid : emptyValidation,
    );
  vi.mocked(reviewPlan).mockReset().mockResolvedValue(review);
  vi.mocked(analyzePlan).mockReset().mockResolvedValue(analysis);
  vi.mocked(createCouncilSession).mockReset().mockResolvedValue(session.id);
  vi.mocked(getCouncilSession).mockReset().mockResolvedValue(session);
});
afterEach(() => localStorage.clear());

async function openReview() {
  fireEvent.click(await screen.findByRole('button', { name: 'пример плана' }));
  await waitFor(() =>
    expect(
      screen.getByRole('button', { name: 'разобрать партию' }),
    ).toBeEnabled(),
  );
  fireEvent.click(screen.getByRole('button', { name: 'разобрать партию' }));
  await screen.findByRole('region', { name: 'Результат плана' });
}

describe('council application journey', () => {
  it('starts from review and applies the verified package as a new review while retaining replay', async () => {
    render(<App />);
    await openReview();
    fireEvent.click(screen.getByRole('button', { name: /вынести на совет/ }));
    fireEvent.click(screen.getByRole('button', { name: /начать заседание/ }));
    const protocolPanel = await screen.findByRole('region', {
      name: 'Протокол заседания',
    });
    expect(protocolPanel).toHaveTextContent('57,21');
    expect(createCouncilSession).toHaveBeenCalledWith(scenario.examples.strong);
    expect(localStorage.getItem('qol-council-session')).toBe(session.id);
    fireEvent.click(
      within(protocolPanel).getByRole('button', { name: /принять/ }),
    );
    await screen.findByRole('region', { name: 'Результат плана' });
    expect(reviewPlan).toHaveBeenLastCalledWith(improved);
    expect(JSON.parse(localStorage.getItem('qol-council-plan')!)).toEqual(
      improved,
    );
    fireEvent.click(screen.getByRole('button', { name: /запись совета/ }));
    expect(
      await screen.findByRole('region', { name: 'Протокол заседания' }),
    ).toHaveTextContent('Проверенная поправка ЛРТ.');
    fireEvent.click(screen.getByRole('button', { name: '← к результатам' }));
    expect(
      await screen.findByRole('region', { name: 'Результат плана' }),
    ).toBeInTheDocument();
  });
  it('restores a saved council on reload and returns to its original plan', async () => {
    localStorage.setItem('qol-council-session', session.id);
    localStorage.setItem(
      'qol-council-plan',
      JSON.stringify(scenario.examples.strong),
    );
    render(<App />);
    expect(
      await screen.findByRole('region', { name: 'Протокол заседания' }),
    ).toHaveTextContent('57,21');
    fireEvent.click(screen.getByRole('button', { name: '← к результатам' }));
    await screen.findByRole('region', { name: 'Результат плана' });
    expect(reviewPlan).toHaveBeenLastCalledWith(scenario.examples.strong);
    fireEvent.click(screen.getByRole('button', { name: 'конструктор' }));
    fireEvent.click(screen.getByRole('button', { name: 'Удалить M7' }));
    expect(screen.getByRole('button', { name: 'совет' })).toBeDisabled();
    expect(localStorage.getItem('qol-council-session')).toBeNull();
  });
  it('returns to the builder if restored session has no usable saved plan', async () => {
    localStorage.setItem('qol-council-session', session.id);
    render(<App />);
    await screen.findByRole('region', { name: 'Протокол заседания' });
    fireEvent.click(screen.getByRole('button', { name: '← к результатам' }));
    expect(
      await screen.findByRole('heading', {
        name: 'Конструктор плана развития Астаны',
      }),
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'результаты' })).toBeDisabled();
  });
});
