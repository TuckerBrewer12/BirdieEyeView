import { describe, expect, it } from "vitest";
import { courseResponse } from "@/testing/fakes/courseResponses";
import { roundResponse } from "@/testing/fakes/roundResponses";
import {
  halfMoonBayCourse,
  halfMoonBayRound,
  overParRound,
  pebbleBeachCourse,
  ratedHalfMoonBayRound,
  scannedRound,
} from "@/testing/fixtures/roundDetails";
import { populatedRounds, storedRounds } from "@/testing/fixtures/rounds";
import { scannedTeeCard } from "@/testing/fixtures/scan";
import { Round } from "../round";

describe("Round.fromSummary", () => {
  it("reads the figures the server sent", () => {
    const round = Round.fromSummary(populatedRounds[0]);
    expect(round.score).toBe(78);
    expect(round.toPar).toBe(6);
    expect(round.frontNine.total).toBe(40);
    expect(round.backNine.total).toBe(38);
    expect(round.putts).toBe(32);
    expect(round.holes[0]).toEqual({ hole: 1, strokes: 5, kind: "bogey", runningToPar: 1 });
  });

  it("splits the holes into nines by hole number", () => {
    const round = Round.fromSummary(populatedRounds[0]);
    expect(round.frontNine.holes.map((h) => h.hole)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect(round.backNine.holes.map((h) => h.hole)).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18]);
  });
});

const yardsFrom = (base: number) =>
  Object.fromEntries(Array.from({ length: 18 }, (_, i) => [i + 1, base + i]));

const measuredCourse = courseResponse({
  ...halfMoonBayCourse,
  tees: [
    { ...halfMoonBayCourse.tees[0], total_yardage: null, hole_yardages: yardsFrom(300) },
    { ...halfMoonBayCourse.tees[1], total_yardage: null, hole_yardages: yardsFrom(250) },
  ],
});
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
  it("reads the round's flow as the server sent it", () => {
    const round = Round.fromDto(overParRound);
    expect(round.holes.slice(0, 7).map((hole) => hole.runningToPar)).toEqual([1, 1, 1, 2, 3, 3, 4]);
    expect(round.worstStretch).toEqual({ firstHole: 4, lastHole: 7, toPar: 3 });
  });

  it("clears the server's flow once an edit moves a hole's score", () => {
    const round = Round.fromDto(overParRound);
    expect(Round.previewEdits(round, { 1: { putts: 1 } }).worstStretch).toEqual(round.worstStretch);
    const edited = Round.previewEdits(round, { 1: { strokes: 4 } });
    expect(edited.worstStretch).toBeNull();
    expect(edited.holes.every((hole) => hole.runningToPar == null)).toBe(true);
  });

  it("reproduces the server's figures when nothing is edited", () => {
    for (const stored of storedRounds) {
      const round = Round.fromDto(roundResponse(stored));
      expect(Round.previewEdits(round, {})).toEqual(round);
    }
  });

  it("recomputes score, to-par, nines and counts from edited strokes", () => {
    const round = Round.fromDto(halfMoonBayRound);
    const preview = Round.previewEdits(round, { 1: { strokes: 4 }, 2: { strokes: null } });
    expect(preview.score).toBe(73);
    expect(preview.toPar).toBe(5);
    expect(preview.frontNine.total).toBeNull();
    expect(preview).toMatchObject({ holesPlayed: 17, courseHandicap: null, netScore: null });
    expect(preview.holes[0]).toMatchObject({ strokes: 4, toPar: 0, kind: "par" });
    expect(preview.scoreCounts.par).toBe(round.scoreCounts.par);
    expect(round.score).toBe(78);
  });

  it("nets an edited score off the server's course handicap, and marks three-putts as the server does", () => {
    const round = Round.fromDto(ratedHalfMoonBayRound);
    expect(round).toMatchObject({ holesPlayed: 18, courseHandicap: 12, netScore: 78 - 12 });
    const preview = Round.previewEdits(round, { 1: { strokes: round.holes[0].strokes! + 1, putts: 3 } });
    expect(preview).toMatchObject({ courseHandicap: 12, netScore: 79 - 12 });
    expect(preview.holes[0].threePutt).toBe(true);
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

describe("Round.fromScan", () => {
  it("reads a scanned card against the course and tee the scan found", () => {
    const round = Round.fromScan(scannedTeeCard);
    expect(round.holes[0]).toMatchObject({ hole: 1, par: 4, yardage: 402, strokes: 5, toPar: 1, kind: "bogey", shotsToGreen: 3 });
    expect(round.frontNine).toMatchObject({ total: 40, par: 36, toPar: 4, yards: 3412 });
    expect(round.backNine).toMatchObject({ total: 41, par: 36, toPar: 5, yards: 3444 });
    expect(round).toMatchObject({ score: 81, par: 72, toPar: 9, yards: 6856, putts: null, gir: null });
    expect(round.course?.name).toBe("Torrey Pines");
  });

  it("leaves par and to-par out when the scan found no course", () => {
    const round = Round.fromScan({ ...scannedTeeCard, course: null });
    expect(round.holes[0]).toMatchObject({ par: null, toPar: null, kind: null, yardage: null });
    expect(round).toMatchObject({ score: 81, par: null, toPar: null });
  });
});
