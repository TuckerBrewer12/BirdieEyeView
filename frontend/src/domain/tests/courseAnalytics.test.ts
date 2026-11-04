import { describe, expect, it } from "vitest";
import { emptyCourseAnalytics, halfMoonBayAnalytics } from "@/testing/fixtures/courseAnalytics";
import { EMPTY_COURSE_ANALYTICS, courseAnalyticsFrom } from "../courseAnalytics";

describe("courseAnalyticsFrom", () => {
  const analytics = courseAnalyticsFrom(halfMoonBayAnalytics);

  it("carries the server's course figures and rounds", () => {
    expect([analytics.roundsPlayed, analytics.scoringAverage, analytics.bestScore, analytics.worstScore]).toEqual([
      2, 75, 72, 78,
    ]);
    expect(analytics.rounds.map((round) => round.id)).toEqual(["round-1", "round-2"]);
    expect(analytics.scoreTrend.map((point) => [point.score, point.toPar])).toEqual(
      halfMoonBayAnalytics.score_trend_on_course.map((row) => [row.total_score, row.to_par]),
    );
    // The trend's average and its headline are the server's, read as sent.
    expect(analytics.scoreTrend.map((point) => point.rollingAverage)).toEqual(
      halfMoonBayAnalytics.score_trend_on_course.map((row) => row.rolling_average),
    );
    expect([analytics.recentAverage, analytics.recentAverageChange]).toEqual([
      halfMoonBayAnalytics.recent_average,
      halfMoonBayAnalytics.recent_average_change,
    ]);
    expect(analytics.scoreTrend.every((point) => point.differentialStatus === "unrated")).toBe(true);
  });

  it("names each hole row by hole, with the score kinds keyed the way the kit keys them", () => {
    expect(analytics.holeToPar[2]).toEqual({ hole: 3, averageScore: 3.5, averageToPar: 0.5 });
    expect(analytics.scoreMix[0]).toEqual({
      hole: 1,
      rounds: 2,
      eagle: 0,
      birdie: 50,
      par: 50,
      bogey: 0,
      double: 0,
      triple: 0,
      quad: 0,
    });
    expect(analytics.gir[1]).toEqual({ hole: 2, value: 100 });
    expect(analytics.putts[0]).toEqual({ hole: 1, value: 2 });
    expect(analytics.variance[0]).toEqual({ hole: 1, value: 0.5 });
    expect(analytics.difficulty).toHaveLength(18);
  });

  it("reads a course the golfer hasn't played as empty", () => {
    expect(courseAnalyticsFrom(emptyCourseAnalytics("course-hmb"))).toEqual(EMPTY_COURSE_ANALYTICS);
  });
});
