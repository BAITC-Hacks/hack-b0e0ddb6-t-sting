import type { Plan } from '../../api/contracts';
import { isPlan } from '../../api/councilSchema';

const sessionKey = 'qol-council-session';
const planKey = 'qol-council-plan';

export function savedCouncilSession(): string | null {
  try {
    return localStorage.getItem(sessionKey);
  } catch {
    return null;
  }
}

export function savedCouncilPlan(): Plan {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(planKey) ?? '[]');
    return isPlan(value) ? (value as Plan) : [];
  } catch {
    return [];
  }
}

export function saveCouncilSession(id: string, plan: Plan) {
  try {
    localStorage.setItem(sessionKey, id);
    localStorage.setItem(planKey, JSON.stringify(plan));
  } catch {
    /* The current session works if storage is unavailable. */
  }
}

export function saveCouncilPlan(plan: Plan) {
  try {
    localStorage.setItem(planKey, JSON.stringify(plan));
  } catch {
    /* Optional replay persistence. */
  }
}

export function clearCouncilSession() {
  try {
    localStorage.removeItem(sessionKey);
    localStorage.removeItem(planKey);
  } catch {
    /* No persisted session to clear. */
  }
}
