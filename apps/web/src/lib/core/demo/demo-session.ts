import { syncLoginStorage } from '@core/util/cookies';

const SESSION_KEY = 'fintail:demo-session';

/** The email the visitor signed in to the demo with, if they have. */
export function demoSessionEmail(): string | undefined {
  try {
    return localStorage.getItem(SESSION_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

/** Sign in to the demo: nothing leaves the browser. */
export function startDemoSession(email: string) {
  try {
    localStorage.setItem(SESSION_KEY, email || 'demo@fintail.app');
  } catch {
    // Private windows can refuse storage; the session then lasts the tab.
  }
  syncLoginStorage(true);
}

/** Sign out of the demo. */
export function endDemoSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    // Nothing stored.
  }
  syncLoginStorage(false);
}
