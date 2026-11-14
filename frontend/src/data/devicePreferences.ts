export interface PreferenceStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

let storage: PreferenceStorage | null = null;

export function configurePreferenceStorage(next: PreferenceStorage | null): void {
  storage = next;
}

export function readPreference(key: string): string | null {
  try {
    return storage?.getItem(key) ?? null;
  } catch {
    return null;
  }
}

export function writePreference(key: string, value: string): void {
  try {
    storage?.setItem(key, value);
  } catch {
    // Storage can be blocked; the choice still applies for this visit.
  }
}
