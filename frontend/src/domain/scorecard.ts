import type { RoundSummary } from "@/types/golf";
import { holeResult, type HoleResult } from "./round";
import { strokesToPar } from "./score";

export interface Nine<H extends HoleResult = HoleResult> {
  holes: H[];
  /** Strokes over the nine. Null until all nine holes are scored, matching the round list. */
  total: number | null;
}

/** A round as the card reads it: the holes, each nine, and the totals. */
export interface Scorecard<H extends HoleResult = HoleResult> {
  holes: H[];
  frontNine: Nine<H>;
  backNine: Nine<H>;
  totalScore: number | null;
  par: number | null;
  toPar: number | null;
}

export function nine<H extends HoleResult>(holes: H[]): Nine<H> {
  const scored = holes.filter((hole) => hole.strokes != null);
  const total =
    holes.length === 9 && scored.length === 9
      ? scored.reduce((sum, hole) => sum + hole.strokes!, 0)
      : null;
  return { holes, total };
}

export function frontNine<H extends HoleResult>(holes: H[]): Nine<H> {
  return nine(holes.filter((hole) => hole.hole <= 9));
}

export function backNine<H extends HoleResult>(holes: H[]): Nine<H> {
  return nine(holes.filter((hole) => hole.hole >= 10));
}

export function scorecard<H extends HoleResult>(
  holes: H[],
  totals: { totalScore: number | null; par: number | null },
): Scorecard<H> {
  return {
    holes,
    frontNine: frontNine(holes),
    backNine: backNine(holes),
    totalScore: totals.totalScore,
    par: totals.par,
    toPar: strokesToPar(totals.totalScore, totals.par),
  };
}

/** The card a round summary carries. The server's stored figures win over the ones the holes imply. */
export function summaryScorecard(summary: RoundSummary): Scorecard {
  const holes = (summary.hole_scores_summary ?? []).map((hole) => holeResult(hole.h, hole.s, hole.p));
  const card = scorecard(holes, { totalScore: summary.total_score, par: summary.course_par });
  return {
    ...card,
    frontNine: { ...card.frontNine, total: summary.front_nine ?? card.frontNine.total },
    backNine: { ...card.backNine, total: summary.back_nine ?? card.backNine.total },
    toPar: summary.to_par ?? card.toPar,
  };
}
