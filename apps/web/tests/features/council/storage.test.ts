import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearCouncilSession,
  savedCouncilPlan,
  savedCouncilSession,
  saveCouncilPlan,
  saveCouncilSession,
} from '../../../src/features/council/storage';

beforeEach(() => localStorage.clear());

describe('council replay storage', () => {
  it('saves a session and a validated plan and clears both when the builder changes', () => {
    const plan = [{ measureId: 'M3' as const, districtId: 'nura' as const }];
    saveCouncilSession('id-1', plan);
    expect(savedCouncilSession()).toBe('id-1');
    expect(savedCouncilPlan()).toEqual(plan);
    saveCouncilPlan([]);
    expect(savedCouncilPlan()).toEqual([]);
    clearCouncilSession();
    expect(savedCouncilSession()).toBeNull();
  });

  it('ignores corrupt stored plans and denied storage access', () => {
    localStorage.setItem('qol-council-plan', '{bad');
    expect(savedCouncilPlan()).toEqual([]);
    localStorage.setItem(
      'qol-council-plan',
      JSON.stringify([{ measureId: 'M99' }]),
    );
    expect(savedCouncilPlan()).toEqual([]);
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('denied');
      },
      setItem: () => {
        throw new Error('quota');
      },
      removeItem: () => {
        throw new Error('denied');
      },
    });
    expect(savedCouncilSession()).toBeNull();
    expect(savedCouncilPlan()).toEqual([]);
    expect(() => saveCouncilSession('id-1', [])).not.toThrow();
    expect(() => saveCouncilPlan([])).not.toThrow();
    expect(() => clearCouncilSession()).not.toThrow();
  });
});
