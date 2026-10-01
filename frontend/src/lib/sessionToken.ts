const ACCESS_TOKEN_KEY = "bev_access_token";
const LEGACY_ACCESS_TOKEN_KEYS = ["scanscore_access_token"];

export interface TokenStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

let storage: TokenStorage | null = null;

/** The app edge passes localStorage on web, or another store on native. */
export function configureSessionStorage(next: TokenStorage | null): void {
  storage = next;
}

export function getSessionToken(): string | null {
  if (!storage) return null;
  const token = storage.getItem(ACCESS_TOKEN_KEY)?.trim() ?? "";
  return token || null;
}

export function setSessionToken(token: string | null): void {
  if (!storage) return;
  for (const key of LEGACY_ACCESS_TOKEN_KEYS) {
    storage.removeItem(key);
  }
  if (!token) {
    storage.removeItem(ACCESS_TOKEN_KEY);
    return;
  }
  storage.setItem(ACCESS_TOKEN_KEY, token);
}

export function withAuthHeaders(init: HeadersInit = {}): Headers {
  const headers = new Headers(init);
  const token = getSessionToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  return headers;
}
