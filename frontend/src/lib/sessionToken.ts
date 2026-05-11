const LEGACY_ACCESS_TOKEN_KEYS = ["bev_access_token", "scanscore_access_token"];

export function setSessionToken(token: string | null): void {
  if (typeof window === "undefined") return;
  try {
    for (const key of LEGACY_ACCESS_TOKEN_KEYS) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Storage can be unavailable in hardened browser contexts.
  }
  void token;
}

export function withAuthHeaders(init: HeadersInit = {}): Headers {
  return new Headers(init);
}
