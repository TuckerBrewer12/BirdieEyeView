export const USER_FACING_ERRORS = {
  request: "We couldn't complete your request. Please try again.",
  account: "We couldn't complete this account request. Please try again.",
  scan: "We couldn't scan this scorecard. Please try again.",
  saveRound: "We couldn't save this round. Please try again.",
  deleteRound: "We couldn't delete this round. Please try again.",
} as const;

export async function fetchWithUserFacingError(
  input: RequestInfo | URL,
  init?: RequestInit,
  fallback: string = USER_FACING_ERRORS.request,
): Promise<Response> {
  try {
    return await fetch(input, init);
  } catch {
    throw new Error(fallback);
  }
}

export async function getUserFacingError(
  response: Response,
  fallback: string = USER_FACING_ERRORS.request,
): Promise<string> {
  if (response.status >= 500) return fallback;

  try {
    const payload: unknown = await response.json();
    if (typeof payload !== "object" || payload === null || !("detail" in payload)) {
      return fallback;
    }

    const detail = (payload as { detail?: unknown }).detail;
    return typeof detail === "string" && detail.trim() ? detail : fallback;
  } catch {
    return fallback;
  }
}

export async function parseJsonResponse<T>(
  response: Response,
  fallback: string = USER_FACING_ERRORS.request,
): Promise<T> {
  try {
    return await response.json() as T;
  } catch {
    throw new Error(fallback);
  }
}
