import { describe, expect, it } from "vitest";
import { emptyCourseAnalytics, halfMoonBayAnalytics } from "@/testing/fixtures/courseAnalytics";
import { EMPTY_COURSE_ANALYTICS, courseAnalyticsFrom } from "../courseAnalytics";

describe("courseAnalyticsFrom", () => {
  const analytics = courseAnalyticsFrom(halfMoonBayAnalytics);

  it("carries the server's record and rounds, newest first", () => {
    expect([analytics.roundsPlayed, analytics.scoringAverage, analytics.scoringAverageToPar]).toEqual([2, 75, 3]);
    expect(analytics.lastPlayed).toBe("2026-06-15T18:00:00.000Z");
    expect(analytics.rounds.map((round) => round.id)).toEqual(["round-1", "round-2"]);
  });

  it("finds the best and worst rounds among the rounds by the server's ids", () => {
    expect(analytics.bestRound?.id).toBe("round-2");
    expect(analytics.worstRound?.id).toBe("round-1");
    expect(analytics.bestRound).toBe(analytics.rounds[1]);
  });

  it("names each hole row by hole, and keeps the nines as the server added them", () => {
    expect(analytics.holeToPar[2]).toEqual({ hole: 3, averageScore: 3.5, averageToPar: 0.5 });
    expect(analytics.greens[1]).toEqual({ hole: 2, value: 100 });
    expect(analytics.nineToPar).toEqual({ front: -1.5, back: -1.5, total: -3 });
    expect(analytics.nineGreens.total).toBe(75);
  });

  it("reads a course the golfer hasn't played as empty", () => {
    expect(courseAnalyticsFrom(emptyCourseAnalytics("course-hmb"))).toEqual(EMPTY_COURSE_ANALYTICS);
  });
});
