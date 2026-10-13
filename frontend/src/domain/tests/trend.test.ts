import { describe, expect, it } from "vitest";
import { emptyAnalytics, populatedAnalytics } from "@/testing/fixtures/dashboard";
import { trendPointsFrom } from "../trend";

describe("trendPointsFrom", () => {
  it("joins each round's score with the handicap after it", () => {
    const [first, second] = trendPointsFrom(populatedAnalytics);
    expect(first).toEqual({
      roundIndex: 1,
      score: 85,
      toPar: 13,
      handicapIndex: 14,
      courseName: "Scanned Scorecard",
      differentialStatus: "out",
    });
    expect(second.differentialStatus).toBe("counting");
  });

  it("pairs by position when the handicap trend's round numbers run ahead", () => {
    const trends = {
      ...emptyAnalytics(),
      score_trend: [{ round_index: 1, round_id: "a", total_score: 80, to_par: 8, course_name: null }],
      handicap_trend: [{ round_index: 21, round_id: "a", handicap_index: 12.1, differential_status: "close" as const }],
    };
    expect(trendPointsFrom(trends)[0]).toMatchObject({ handicapIndex: 12.1, differentialStatus: "close" });
  });

  it("is empty before analytics load", () => {
    expect(trendPointsFrom(null)).toEqual([]);
  });
});
