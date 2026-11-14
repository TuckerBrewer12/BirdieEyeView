import { describe, expect, it } from "vitest";
import { populatedDashboard } from "@/testing/fixtures/dashboard";
import { NO_COUNTS } from "@/testing/fixtures/scoreCounts";
import { formatPercent } from "../format";
import { averageLine, moveOf, trendPointsFrom } from "../trend";

describe("trendPointsFrom", () => {
  it("joins each round's score with the handicap after it", () => {
    const [first, second] = trendPointsFrom(populatedDashboard);
    expect(first).toEqual({
      roundIndex: 1,
      score: 85,
      toPar: 13,
      par: 72,
      rollingAverage: 85,
      handicapIndex: 14,
      courseName: "Scanned Scorecard",
      differentialStatus: "out",
      inWindow: true,
    });
    expect(second.differentialStatus).toBe("counting");
  });

  it("pairs by position when the handicap trend's round numbers run ahead", () => {
    const trends = {
      score_trend: [
        { round_index: 1, round_id: "a", total_score: 80, to_par: 8, par: 72, course_name: null, rolling_average: 80, score_counts: NO_COUNTS },
      ],
      handicap_trend: [{
        round_index: 21,
        round_id: "a",
        handicap_index: 12.1,
        differential: 9.4,
        used_in_hi: false,
        hi_threshold: 8.2,
        differential_status: "close" as const,
        in_window: true,
      }],
    };
    expect(trendPointsFrom(trends)[0]).toMatchObject({ handicapIndex: 12.1, differentialStatus: "close" });
  });

  it("is empty before the trends load", () => {
    expect(trendPointsFrom(null)).toEqual([]);
  });
});

describe("averageLine", () => {
  it("labels the average, in the trend's own figures", () => {
    expect(averageLine(75)).toEqual({ value: 75, label: "Avg 75.0" });
    expect(averageLine(41.6, formatPercent)).toEqual({ value: 41.6, label: "Avg 42%" });
    expect(averageLine(null)).toBeNull();
  });
});

describe("moveOf", () => {
  it("gives the way a figure moved and how far, unsigned, and nothing for no move", () => {
    expect(moveOf(-1.64)).toEqual({ direction: "down", amount: "1.6" });
    expect(moveOf(3, String)).toEqual({ direction: "up", amount: "3" });
    expect(moveOf(0)).toEqual({ direction: null, amount: "" });
    expect(moveOf(null)).toEqual({ direction: null, amount: "" });
  });
});
