import type { RoundTrendPoint } from "@/domain";

const scores = [84, 81, 86, 79, 83, 78, 88, 80, 77, 82, 79, 85, 76, 80, 78, 81, 74, 79, 77, 78];
const indexes = [
  12.4, 12.3, 12.5, 12.1, 12.0, 11.7, 11.9, 11.6, 11.2, 11.3, 11.0, 11.2, 10.8, 10.7, 10.5, 10.6, 10.1, 10.0, 9.9, 9.8,
];
// The eight lowest scores are the ones the index is worked from.
const counting = new Set(
  scores
    .map((score, i) => ({ score, i }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 8)
    .map((r) => r.i),
);

/** Twenty rounds on a par 72, the index easing down from 12.4 to 9.8. */
export const trend: RoundTrendPoint[] = scores.map((score, i) => ({
  roundIndex: i + 1,
  score,
  toPar: score - 72,
  handicapIndex: indexes[i],
  courseName: "Half Moon Bay",
  // The board's rating and slope: (score − 65.8) × 113 / 125.
  differential: Math.round((score - 65.8) * 0.904 * 10) / 10,
  differentialStatus: counting.has(i) ? "counting" : "out",
}));
