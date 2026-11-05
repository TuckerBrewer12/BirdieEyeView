/** Where choices that stay on this device are kept: localStorage on the web. */
export interface PreferenceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

let storage: PreferenceStorage | null = null;

/** The app edge passes the platform's store; until then nothing is read or kept. */
export function configurePreferenceStorage(next: PreferenceStorage | null): void {
  storage = next;
}

export function readPreference(key: string): string | null {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    // Storage can be blocked; read as unset.
    return null;
  }
}

export function writePreference(key: string, value: string): void {
  try {
    storage?.setItem(key, value);
  } catch {
    // The choice still applies for this visit.
  }
}
