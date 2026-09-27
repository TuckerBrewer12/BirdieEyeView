import { describe, expect, it } from "vitest";
import { halfMoonBayRound, pebbleBeachCourse, scannedRound } from "@/testing/fixtures/roundDetails";
import { populatedRounds } from "@/testing/fixtures/rounds";
import { Round } from "../round";

describe("Round.fromSummary", () => {
  it("reads the figures the server sent", () => {
    const round = Round.fromSummary(populatedRounds[0]);
    expect(round.score).toBe(78);
    expect(round.toPar).toBe(6);
    expect(round.frontNine.total).toBe(40);
    expect(round.backNine.total).toBe(38);
    expect(round.putts).toBe(32);
    expect(round.holes[0]).toMatchObject({ hole: 1, par: 4, strokes: 5, toPar: 1, kind: "bogey" });
  });

  it("splits the holes into nines by hole number", () => {
    const round = Round.fromSummary(populatedRounds[0]);
    expect(round.frontNine.holes.map((h) => h.hole)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(round.backNine.holes.map((h) => h.hole)).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18]);
  });
});

describe("Round.fromDto", () => {
  it("names an unlinked round after the card", () => {
    expect(Round.fromDto(scannedRound).course?.name).toBe("Scanned Scorecard");
    expect(Round.fromDto(halfMoonBayRound).course?.id).toBe("course-hmb");
  });
});

describe("Round.previewEdits", () => {
  it("reproduces the server's figures when nothing is edited", () => {
    for (const summary of populatedRounds) {
      const round = Round.fromSummary(summary);
      expect(Round.previewEdits(round, {})).toEqual(round);
    }
  });

  it("recomputes score, to-par, nines and counts from edited strokes", () => {
    const round = Round.fromDto(halfMoonBayRound);
    const preview = Round.previewEdits(round, { 1: { strokes: 4 }, 2: { strokes: null } });
    expect(preview.score).toBe(73);
    expect(preview.toPar).toBe(1);
    expect(preview.frontNine.total).toBeNull();
    expect(preview.holes[0]).toMatchObject({ strokes: 4, toPar: 0, kind: "par" });
    expect(preview.scoreCounts.par).toBe(round.scoreCounts.par);
    expect(round.score).toBe(78);
  });

  it("reads pars from a course picked while editing", () => {
    const round = Round.fromDto(scannedRound);
    const preview = Round.previewEdits(round, {}, pebbleBeachCourse);
    expect(preview.par).toBe(72);
    expect(preview.holes[0].par).toBe(4);
  });
});
