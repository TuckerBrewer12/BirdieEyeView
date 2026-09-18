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

/** Fill class for a tee chip or scorecard tee badge. */
export function teeSwatchClass(color: string | null): string {
  switch ((color ?? "").toLowerCase()) {
    case "black":
      return "bg-foreground";
    case "white":
      return "bg-card ring-1 ring-border";
    case "blue":
      return "bg-score-double";
    case "gold":
    case "yellow":
      return "bg-score-eagle";
    case "red":
      return "bg-score-bogey";
    case "green":
      return "bg-primary";
    case "silver":
      return "bg-muted-foreground";
    default:
      return "bg-muted";
  }
}

/** Text class that stays readable on teeSwatchClass. */
export function teeSwatchTextClass(color: string | null): string {
  const key = (color ?? "").toLowerCase();
  if (key === "white" || key === "yellow" || key === "gold") return "text-foreground";
  return "text-primary-foreground";
}
