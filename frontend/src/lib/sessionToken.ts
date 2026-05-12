const LEGACY_ACCESS_TOKEN_KEYS = ["bev_access_token", "scanscore_access_token"];

export function setSessionToken(): void {
  if (typeof window === "undefined") return;
  try {
    for (const key of LEGACY_ACCESS_TOKEN_KEYS) {
      window.localStorage.removeItem(key);
    }
  } catch {
    // Storage can be unavailable in hardened browser contexts.
  }
}

export function withAuthHeaders(init: HeadersInit = {}): Headers {
  return new Headers(init);
}
