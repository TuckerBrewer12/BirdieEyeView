function normalizeApiBaseUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  // Railway env vars are often entered as a host only; default protocol safely.
  if (!/^https?:\/\//i.test(trimmed)) {
    const hostOnly = /^[a-z0-9.-]+(?::\d+)?$/i.test(trimmed);
    if (hostOnly) {
      const isLocal = /^(localhost|127\.0\.0\.1|::1)(:\d+)?$/i.test(trimmed);
      return `${isLocal ? "http" : "https"}://${trimmed}`.replace(/\/+$/, "");
    }
  }

  return trimmed.replace(/\/+$/, "");
}

let apiBaseUrl = "";

/** The app edge reads Vite env (or a native config) and passes the raw value in. */
export function configureApiBaseUrl(raw: string | undefined): void {
  apiBaseUrl = normalizeApiBaseUrl(raw?.trim() ?? "");
}

export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return apiBaseUrl ? `${apiBaseUrl}${normalizedPath}` : normalizedPath;
}
