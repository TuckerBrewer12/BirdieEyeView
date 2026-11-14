import { describe, expect, it } from "vitest";
import { courseAnalyticsFrom } from "@/domain/courseAnalytics";
import { courseResponse } from "@/testing/fakes/courseResponses";
import { emptyCourseAnalytics, halfMoonBayAnalytics } from "@/testing/fixtures/courseAnalytics";
import { halfMoonBayCourse } from "@/testing/fixtures/roundDetails";
import {
  greensFigures,
  holesInOrder,
  nineFrom,
  recordFigures,
  selectedTee,
  teeLine,
  trendPoints,
} from "../courseDetailModel";

const PARS = [4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 4, 3, 5];

const measured = courseResponse({
  id: "c1",
  name: "Measured",
  location: null,
  par: null,
  holes: PARS.map((par, i) => ({ number: i + 1, par, handicap: i + 1 })),
  tees: [
    {
      color: "Blue",
      total_yardage: null,
      hole_yardages: Object.fromEntries(PARS.map((_, i) => [i + 1, 400])),
      slope_rating: null,
      course_rating: null,
    },
  ],
});

describe("nineFrom", () => {
  it("reads each nine's par and yards off the course and tee, with the course's totals only on the back", () => {
    const tee = measured.tees[0];
    const front = nineFrom(measured, "front", tee, null);
    const back = nineFrom(measured, "back", tee, null);

    expect(front.holes.map((h) => h.hole)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect([front.nine.par, front.nine.yards, front.course]).toEqual([36, 3600, null]);
    expect([back.nine.par, back.nine.yards]).toEqual([36, 3600]);
    expect(back.course).toEqual({ par: 72, yards: 7200, averageToPar: null, greens: null });
  });

  it("leaves yards empty when the tee has no hole yardages", () => {
    const blue = halfMoonBayCourse.tees[0];
    const back = nineFrom(halfMoonBayCourse, "back", blue, null);
    expect(back.holes[0]?.yards).toBeNull();
    expect(back.nine.yards).toBeNull();
    expect(back.course?.yards).toBe(6500);
  });

  it("adds the golfer's average to par and greens per hole, per nine, and for the course", () => {
    const analytics = courseAnalyticsFrom(halfMoonBayAnalytics);
    const front = nineFrom(halfMoonBayCourse, "front", null, analytics);
    const back = nineFrom(halfMoonBayCourse, "back", null, analytics);

    expect(front.holes[0]?.averageToPar).toEqual({ value: -0.5, label: "\u22120.5" });
    expect(front.holes[2]?.averageToPar).toEqual({ value: 0.5, label: "+0.5" });
    expect([front.holes[0]?.greens, front.holes[1]?.greens]).toEqual([50, 100]);
    expect(front.nine.averageToPar?.label).toBe("\u22121.5");
    expect(back.course?.averageToPar?.label).toBe("\u22123.0");
    expect(back.course?.greens).toBe(75);
  });

  it("leaves the golfer's rows empty for a hole they haven't played", () => {
    const front = nineFrom(halfMoonBayCourse, "front", null, courseAnalyticsFrom(emptyCourseAnalytics("course-hmb")));
    expect([front.holes[0]?.averageToPar, front.holes[0]?.greens, front.nine.averageToPar]).toEqual([null, null, null]);
  });
});

describe("selectedTee", () => {
  it("follows the longest tee until the golfer picks, then their pick", () => {
    expect(selectedTee(halfMoonBayCourse, null)?.color).toBe("Blue");
    expect(selectedTee(halfMoonBayCourse, "white")?.color).toBe("White");
    expect(selectedTee(halfMoonBayCourse, "Gold")?.color).toBe("Blue");
  });
});

describe("teeLine", () => {
  it("names the tee with its yardage, rating and slope, and the golfer's course handicap off it", () => {
    expect(teeLine(halfMoonBayCourse.tees[0]!)).toBe("Blue tees · 6,500 yds · 72.4 / 130");
    expect(teeLine({ ...halfMoonBayCourse.tees[0]!, course_handicap: 12 })).toBe(
      "Blue tees · 6,500 yds · 72.4 / 130 · hcp 12",
    );
    expect(teeLine(measured.tees[0]!)).toBe("Blue tees · 7,200 yds");
  });
});

describe("recordFigures", () => {
  it("words the record: rounds and when last, the average and its to par, the best and worst with their day", () => {
    expect(recordFigures(courseAnalyticsFrom(halfMoonBayAnalytics))).toEqual([
      { label: "Rounds", value: "2", toPar: null, note: "last Jun 15", roundId: null },
      { label: "Average", value: "75.0", toPar: { value: 3, label: "+3.0" }, note: null, roundId: null },
      { label: "Best", value: "72", toPar: { value: 0, label: "E" }, note: "May 2", roundId: "round-2" },
      { label: "Worst", value: "78", toPar: { value: 6, label: "+6" }, note: "Jun 15", roundId: "round-1" },
    ]);
  });
});

describe("holesInOrder", () => {
  const holes = courseAnalyticsFrom(halfMoonBayAnalytics).holes;

  it("keeps the course's order, or follows the server's difficulty rank", () => {
    expect(holesInOrder(holes, "course").map((hole) => hole.hole)).toEqual(holes.map((hole) => hole.hole));
    expect(holesInOrder(holes, "hardest").map((hole) => hole.hole).slice(0, 6)).toEqual([3, 6, 9, 12, 15, 18]);
    const reranked = holes.map((hole) => ({ ...hole, difficultyRank: hole.hole === 1 ? 0 : hole.difficultyRank }));
    expect(holesInOrder(reranked, "hardest")[0]?.hole).toBe(1);
  });
});

describe("greensFigures", () => {
  it("words each nine's greens and the course's, with a dash for none", () => {
    expect(greensFigures({ front: 72.2, back: null, total: 75 })).toEqual([
      { label: "Out", value: "72%" },
      { label: "In", value: "—" },
      { label: "Total", value: "75%" },
    ]);
  });
});

describe("trendPoints", () => {
  it("numbers the rounds here, with each score beside its five-round average and its to par", () => {
    expect(trendPoints(courseAnalyticsFrom(halfMoonBayAnalytics).scoreTrend)).toEqual([
      { tick: 1, title: "Round 1 here", values: [72, 72], notes: [{ label: "To par", value: "E" }] },
      { tick: 2, title: "Round 2 here", values: [78, 75], notes: [{ label: "To par", value: "+6" }] },
    ]);
  });
});
