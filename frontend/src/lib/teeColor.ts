const TEE_COLOR_TOKENS = [
  "black", "blue", "white", "gold", "red", "green", "silver",
  "yellow", "orange", "purple", "brown", "combo",
];

export function extractTeeColorToken(value: string | null | undefined): string | null {
  const text = (value ?? "").toLowerCase();
  if (!text) return null;
  for (const token of TEE_COLOR_TOKENS) {
    if (text.includes(token)) return token;
  }
  return null;
}

export function chooseCompatibleTee(current: string, teeColors: string[]): string | null {
  const trimmed = current.trim();
  if (!trimmed || teeColors.length === 0) return null;
  const exact = teeColors.find((c) => c.toLowerCase() === trimmed.toLowerCase());
  if (exact) return exact;
  const currentToken = extractTeeColorToken(trimmed);
  if (!currentToken) return null;
  return teeColors.find((c) => extractTeeColorToken(c) === currentToken) ?? null;
}
