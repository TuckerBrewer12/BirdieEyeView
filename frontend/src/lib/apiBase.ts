const rawApiBaseUrl = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.trim() ?? "";

const normalizedApiBaseUrl = rawApiBaseUrl.replace(/\/+$/, "");

export const API_BASE_URL = normalizedApiBaseUrl;

export function apiUrl(path: string): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return API_BASE_URL ? `${API_BASE_URL}${normalizedPath}` : normalizedPath;
}
