import type { HoleSummary } from "@/domain/round";
import { scoreKind } from "@/domain/score";

/**
 * The round on the hero's photo: what a scan of a card like it reads back. Each hole's kind comes
 * from par and strokes through the domain's own rule; the totals are the card's (71 par, 79, 34 putts).
 */
const PAR = [4, 4, 3, 5, 4, 4, 3, 5, 3, 4, 5, 4, 3, 4, 4, 5, 3, 4];
const STROKES = [5, 4, 3, 6, 5, 4, 4, 5, 3, 4, 6, 5, 3, 5, 4, 5, 4, 4];

export interface SampleRound {
  course: string;
  /** The line under the course: the tees and the putts. */
  detail: string;
  score: number;
  toPar: number;
  holes: HoleSummary[];
}

export const SAMPLE_ROUND: SampleRound = {
  course: "Half Moon Bay Golf Links",
  detail: "Blue tees · 34 putts",
  score: 79,
  toPar: 8,
  holes: STROKES.map((strokes, i) => ({
    hole: i + 1,
    strokes,
    kind: scoreKind(strokes, PAR[i]),
    runningToPar: null,
  })),
};
