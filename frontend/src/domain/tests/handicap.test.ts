import { describe, expect, it } from "vitest";
import {
  courseHandicap,
  formatHandicapIndex,
  netScore,
  ratedCourseHandicap,
  whsWindow,
  handicapDelta,
  handicapTrend,
  whsBreakdown,
} from "../handicap";
import { emptyAnalytics, populatedAnalytics } from "@/testing/fixtures/dashboard";

describe("courseHandicap", () => {
  it("matches the WHS rounded formula", () => {
    expect(courseHandicap(10.4, 130, 72.4, 72)).toBe(12);
  });
});

describe("ratedCourseHandicap", () => {
  it("returns null until HI, ratings, and par are all present", () => {
    const tee = { slope_rating: 130, course_rating: 72.4 };
    expect(ratedCourseHandicap(null, tee, 72)).toBeNull();
    expect(ratedCourseHandicap(10.4, { slope_rating: null, course_rating: 72.4 }, 72)).toBeNull();
    expect(ratedCourseHandicap(10.4, tee, 72)).toBe(12);
  });
});

describe("netScore / formatHandicapIndex / whsWindow", () => {
  it("subtracts course handicap from gross", () => {
    expect(netScore(78, 12)).toBe(66);
  });

  it("formats plus handicaps with a leading +", () => {
    expect(formatHandicapIndex(null)).toBe("—");
    expect(formatHandicapIndex(12.4)).toBe("12.4");
    expect(formatHandicapIndex(-1.2)).toBe("+1.2");
  });

  it("looks up differentials used from rated-round count", () => {
    expect(whsWindow(2)).toEqual({ countUsed: 0, adjustment: 0 });
    expect(whsWindow(3)).toEqual({ countUsed: 1, adjustment: -2 });
    expect(whsWindow(20)).toEqual({ countUsed: 8, adjustment: 0 });
    expect(whsWindow(40)).toEqual({ countUsed: 8, adjustment: 0 });
  });
});

describe("handicapDelta / handicapTrend", () => {
  it("reads the index falling from 14.0 to 12.4 as improving", () => {
    expect(handicapDelta(populatedAnalytics)).toBe(-1.6);
    expect(handicapTrend(populatedAnalytics)).toBe("down");
  });

  it("needs enough rated rounds", () => {
    expect(handicapDelta(emptyAnalytics())).toBeNull();
    expect(handicapTrend(null)).toBeNull();
  });
});

describe("whsBreakdown", () => {
  it("lists rounds newest first and marks the one differential used", () => {
    const whs = whsBreakdown(populatedAnalytics, 12.4);
    expect(whs.rows[0]).toMatchObject({ roundIndex: 5, courseName: "Muni", score: 80 });
    expect(whs.rows.filter((r) => r.used).map((r) => r.courseName)).toEqual(["Blue Rock"]);
    expect(whs).toMatchObject({
      windowSize: 5,
      countUsed: 1,
      adjustment: 0,
      diffAvg: 4.1,
      hasRatedRounds: true,
      showCalculation: true,
    });
  });

  it("hides the calculation without an index", () => {
    expect(whsBreakdown(populatedAnalytics, null).showCalculation).toBe(false);
    expect(whsBreakdown(null, 12.4).rows).toEqual([]);
  });
});
