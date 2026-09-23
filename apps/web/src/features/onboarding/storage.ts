const key = 'qol-sim:onboarding:v1';

/** A blocked browser store must never prevent opening the constructor. */
export function needsOnboarding(): boolean {
  try {
    return localStorage.getItem(key) !== 'seen';
  } catch {
    return true;
  }
}

export function rememberOnboarding(): void {
  try {
    localStorage.setItem(key, 'seen');
  } catch {
    // The current session still dismisses the guide when persistence is unavailable.
  }
}
