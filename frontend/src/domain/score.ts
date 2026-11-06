import { pluralNoun } from "./format";

/** The seven score buckets the app uses. ≤ −2 is eagle (eagle+). ≥ +4 is quad. */
export const SCORE_KINDS = [
  "eagle",
  "birdie",
  "par",
  "bogey",
  "double",
  "triple",
  "quad",
] as const;

export type ScoreKind = (typeof SCORE_KINDS)[number];

/** Share of holes at each score kind, in percent. */
export type ScoreMix = Record<ScoreKind, number>;

/** A server row with a share for each score kind, named as the per-hole and GIR-split rows name them. */
export interface ScoreTypeShares {
  eagle: number;
  birdie: number;
  par: number;
  bogey: number;
  double_bogey: number;
  triple_bogey: number;
  quad_bogey: number;
}

/** A server row's score-kind shares as a {@link ScoreMix}. The server's own `score_mix` fields already are one. */
export function scoreMixFrom(row: ScoreTypeShares): ScoreMix {
  return {
    eagle: row.eagle,
    birdie: row.birdie,
    par: row.par,
    bogey: row.bogey,
    double: row.double_bogey,
    triple: row.triple_bogey,
    quad: row.quad_bogey,
  };
}

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

const SCORE_KIND_LABEL: Record<ScoreKind, { one: string; many: string }> = {
  eagle: { one: "Eagle+", many: "Eagles+" },
  birdie: { one: "Birdie", many: "Birdies" },
  par: { one: "Par", many: "Pars" },
  bogey: { one: "Bogey", many: "Bogeys" },
  double: { one: "Double", many: "Doubles" },
  triple: { one: "Triple", many: "Triples" },
  quad: { one: "Quad+", many: "Quads+" },
};

/** A hole's score kind as a word: "Birdie", "Double". The ends are open, so "Eagle+" and "Quad+". */
export function scoreKindLabel(kind: ScoreKind): string {
  return SCORE_KIND_LABEL[kind].one;
}

/** The word for `count` holes of one kind: "1 Birdie", "3 Birdies". */
export function scoreKindCountLabel(kind: ScoreKind, count: number): string {
  return pluralNoun(count, SCORE_KIND_LABEL[kind].one, SCORE_KIND_LABEL[kind].many);
}

/** A score against par as golfers write it: "E", "+3", "-2". Null when there is no score. */
export function toParLabel(toPar: number | null | undefined): string | null {
  if (toPar == null) return null;
  if (toPar === 0) return "E";
  if (toPar > 0) return `+${toPar}`;
  return `${toPar}`;
}

/**
 * An average to par to two places. Halves round away from even on both sides, so
 * -0.125 is -0.13 just as +0.125 is +0.13.
 */
export function roundAverageToPar(value: number): number {
  return (Math.sign(value) * Math.round(Math.abs(value) * 100)) / 100;
}

/** An average to par, as golfers write it, to two places: "+0.85", "E", "-0.1". */
export function formatAverageToPar(value: number): string {
  return toParLabel(roundAverageToPar(value)) ?? "E";
}

/**
 * The kinds a round had, in display order, with how many holes of each. Chips and
 * legends show one entry per kind, so they match the coloured segments one to one.
 */
export function playedScoreKinds(
  counts: Partial<Record<ScoreKind, number | null>>,
): { kind: ScoreKind; count: number }[] {
  return SCORE_KINDS.flatMap((kind) => {
    const count = counts[kind] ?? 0;
    return count > 0 ? [{ kind, count }] : [];
  });
}
