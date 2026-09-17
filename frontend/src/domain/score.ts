/** The seven score buckets the app uses. ≤ −2 is eagle (eagle+). ≥ +4 is quad. */
export type ScoreKind =
  | "eagle"
  | "birdie"
  | "par"
  | "bogey"
  | "double"
  | "triple"
  | "quad";

/**
 * Classify a hole from strokes and par. Unknown inputs return null —
 * presentation layers decide how to paint a missing score.
 */
export function scoreKind(
  strokes: number | null | undefined,
  par: number | null | undefined,
): ScoreKind | null {
  if (strokes == null || par == null) return null;
  const diff = strokes - par;
  if (diff <= -2) return "eagle";
  if (diff === -1) return "birdie";
  if (diff === 0) return "par";
  if (diff === 1) return "bogey";
  if (diff === 2) return "double";
  if (diff === 3) return "triple";
  return "quad";
}

export function strokesToPar(
  strokes: number | null | undefined,
  par: number | null | undefined,
): number | null {
  if (strokes == null || par == null) return null;
  return strokes - par;
}
