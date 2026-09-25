import { describe, expect, it } from "vitest";
import { populatedRounds } from "@/testing/fixtures/rounds";
import { holeResult } from "../round";
import { scorecard, summaryScorecard } from "../scorecard";

const eighteen = Array.from({ length: 18 }, (_, i) => holeResult(i + 1, 5, 4));

describe("scorecard", () => {
  it("splits the nines by hole number and totals each", () => {
    const card = scorecard(eighteen, { totalScore: 90, par: 72 });
    expect(card.frontNine.holes.map((h) => h.hole)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(card.backNine.holes.map((h) => h.hole)).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18]);
    expect(card.frontNine.total).toBe(45);
    expect(card.backNine.total).toBe(45);
    expect(card.toPar).toBe(18);
  });

  it("puts a back-nine-only round on the back nine", () => {
    const card = scorecard(eighteen.slice(9), { totalScore: 45, par: 36 });
    expect(card.frontNine.holes).toHaveLength(0);
    expect(card.backNine.total).toBe(45);
  });

  it("leaves a nine's total off until all nine are scored", () => {
    const holes = eighteen.map((h) => (h.hole === 12 ? holeResult(12, null, 4) : h));
    const card = scorecard(holes, { totalScore: null, par: 72 });
    expect(card.frontNine.total).toBe(45);
    expect(card.backNine.holes).toHaveLength(9);
    expect(card.backNine.total).toBeNull();
    expect(card.toPar).toBeNull();
  });
});

describe("summaryScorecard", () => {
  const summary = populatedRounds[0];

  it("keeps unscored holes in their slot", () => {
    const card = summaryScorecard({
      ...summary,
      hole_scores_summary: [
        { h: 1, s: 3, p: 4 },
        { h: 2, s: null, p: 4 },
      ],
    });
    expect(card.holes).toEqual([
      { hole: 1, strokes: 3, par: 4, toPar: -1, kind: "birdie" },
      { hole: 2, strokes: null, par: 4, toPar: null, kind: null },
    ]);
  });

  it("is empty when the summary carries no strip", () => {
    const card = summaryScorecard({ ...summary, hole_scores_summary: null, front_nine: null });
    expect(card.holes).toEqual([]);
    expect(card.frontNine).toEqual({ holes: [], total: null });
  });

  it("prefers the stored nine totals", () => {
    const card = summaryScorecard({ ...summary, front_nine: 41, back_nine: null });
    expect(card.frontNine.total).toBe(41);
    expect(card.backNine.total).toBe(38);
  });

  it("prefers the stored to-par", () => {
    expect(summaryScorecard({ ...summary, to_par: 3, total_score: 80, course_par: 72 }).toPar).toBe(3);
  });

  it("falls back to score minus course par", () => {
    expect(summaryScorecard({ ...summary, to_par: null, total_score: 80, course_par: 72 }).toPar).toBe(8);
  });

  it("has no to-par when neither is known", () => {
    expect(summaryScorecard({ ...summary, to_par: null, total_score: 80, course_par: null }).toPar).toBeNull();
  });
});
