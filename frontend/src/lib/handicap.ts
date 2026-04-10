export const MAX_HANDICAP_INDEX = 54;
const HANDICAP_PATTERN = /^\+?(?:\d+\.?\d*|\.\d+)$/;

export interface HandicapParseResult {
  value: number | null;
  error: string | null;
}

export function parseHandicapInput(raw: string): HandicapParseResult {
  const trimmed = raw.trim();
  if (!trimmed) {
    return { value: null, error: null };
  }
  if (!HANDICAP_PATTERN.test(trimmed)) {
    return { value: null, error: "Handicap must be a positive number (for example +5.0)." };
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > MAX_HANDICAP_INDEX) {
    return {
      value: null,
      error: `Handicap must be greater than 0 and at most ${MAX_HANDICAP_INDEX}.`,
    };
  }
  return { value: Math.round(parsed * 10) / 10, error: null };
}
