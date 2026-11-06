import { pluralNoun } from "./format";

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

export type ScoreMix = Record<ScoreKind, number>;

export interface ScoreTypeShares {
  eagle: number;
  birdie: number;
  par: number;
  bogey: number;
  double_bogey: number;
  triple_bogey: number;
  quad_bogey: number;
}

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

export function scoreKindLabel(kind: ScoreKind): string {
  return SCORE_KIND_LABEL[kind].one;
}

export function scoreKindCountLabel(kind: ScoreKind, count: number): string {
  return pluralNoun(count, SCORE_KIND_LABEL[kind].one, SCORE_KIND_LABEL[kind].many);
}

export function toParLabel(toPar: number | null | undefined): string | null {
  if (toPar == null) return null;
  if (toPar === 0) return "E";
  if (toPar > 0) return `+${toPar}`;
  return `${toPar}`;
}

export function roundAverageToPar(value: number): number {
  return (Math.sign(value) * Math.round(Math.abs(value) * 100)) / 100;
}

export function formatAverageToPar(value: number): string {
  return toParLabel(roundAverageToPar(value)) ?? "E";
}

export function playedScoreKinds(
  counts: Partial<Record<ScoreKind, number | null>>,
): { kind: ScoreKind; count: number }[] {
  return SCORE_KINDS.flatMap((kind) => {
    const count = counts[kind] ?? 0;
    return count > 0 ? [{ kind, count }] : [];
  });
}
