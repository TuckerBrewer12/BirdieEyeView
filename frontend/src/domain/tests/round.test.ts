import { describe, expect, it } from "vitest";
import { roundResponse } from "@/testing/fakes/roundResponses";
import { halfMoonBayCourse, halfMoonBayRound, pebbleBeachCourse, scannedRound } from "@/testing/fixtures/roundDetails";
import { storedRounds } from "@/testing/fixtures/rounds";
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

const yardsFrom = (base: number) =>
  Object.fromEntries(Array.from({ length: 18 }, (_, i) => [i + 1, base + i]));

/** Half Moon Bay with hole yardages on both tees, played from the blues. */
const measuredCourse = {
  ...halfMoonBayCourse,
  tees: [
    { ...halfMoonBayCourse.tees[0], total_yardage: null, hole_yardages: yardsFrom(300) },
    { ...halfMoonBayCourse.tees[1], total_yardage: null, hole_yardages: yardsFrom(250) },
  ],
};
const measuredRound = roundResponse({ ...storedRounds[0], course: measuredCourse, tee_box: "Blue" });

describe("Round.fromDto", () => {
  it("names an unlinked round after the card", () => {
    expect(Round.fromDto(scannedRound).course?.name).toBe("Scanned Scorecard");
    expect(Round.fromDto(halfMoonBayRound).course?.id).toBe("course-hmb");
  });

  it("reads each hole's handicap and yardage and each nine's figures", () => {
    const round = Round.fromDto(measuredRound);
    expect(round.holes[0]).toMatchObject({ handicap: 1, yardage: 300 });
    expect(round.frontNine).toMatchObject({ par: 36, toPar: 4, yards: 2736 });
    expect(round.frontNine.putts).toBe(measuredRound.nines.front.putts);
    expect(round.yards).toBe(sumOf(yardsFrom(300)));
  });
});

function sumOf(yards: Record<string, number>): number {
  return Object.values(yards).reduce((sum, y) => sum + y, 0);
}

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

  it("recomputes putts and greens from edited holes", () => {
    const round = Round.fromDto(measuredRound);
    const first = round.holes[0];
    const preview = Round.previewEdits(round, { 1: { putts: first.putts! + 2, gir: !first.gir } });
    expect(preview.putts).toBe(round.putts! + 2);
    expect(preview.frontNine.putts).toBe(round.frontNine.putts! + 2);
    expect(preview.frontNine.gir).toBe(round.frontNine.gir! + (first.gir ? -1 : 1));
  });

  it("reads yardages from a tee picked while editing", () => {
    const round = Round.fromDto(measuredRound);
    const preview = Round.previewEdits(round, {}, measuredCourse, "White");
    expect(preview.holes[0].yardage).toBe(250);
    expect(preview.frontNine.yards).toBe(2286);
    expect(preview.yards).toBe(sumOf(yardsFrom(250)));
  });

  it("drops yardages when a new course has no matching tee", () => {
    const round = Round.fromDto(measuredRound);
    const preview = Round.previewEdits(round, {}, pebbleBeachCourse, "");
    expect(preview.holes[0].yardage).toBeNull();
    expect(preview.frontNine.yards).toBeNull();
    expect(preview.yards).toBeNull();
  });

  it("reads pars from a course picked while editing", () => {
    const round = Round.fromDto(scannedRound);
    const preview = Round.previewEdits(round, {}, pebbleBeachCourse);
    expect(preview.par).toBe(72);
    expect(preview.holes[0].par).toBe(4);
  });
});
