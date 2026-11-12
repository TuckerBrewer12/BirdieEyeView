import { describe, expect, it } from "vitest";
import { populatedDashboard } from "@/testing/fixtures/dashboard";
import { NO_COUNTS } from "@/testing/fixtures/scoreCounts";
import { formatPercent } from "../format";
import { averageLine, moveOf, shortGamePointsFrom, trendPointsFrom } from "../trend";

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
      }],
    };
    expect(trendPointsFrom(trends)[0]).toMatchObject({ handicapIndex: 12.1, differentialStatus: "close" });
  });

  it("is empty before the trends load", () => {
    expect(trendPointsFrom(null)).toEqual([]);
  });
});

describe("shortGamePointsFrom", () => {
  it("puts each round's up-and-down rate beside its scrambling rate, by round", () => {
    const points = shortGamePointsFrom(
      [
        { round_index: 1, round_id: "a", scramble_opportunities: 4, scramble_successes: 1, scramble_failures: 3, scrambling_percentage: 25 },
        { round_index: 2, round_id: "b", scramble_opportunities: 0, scramble_successes: 0, scramble_failures: 0, scrambling_percentage: null },
        { round_index: 3, round_id: "c", scramble_opportunities: 2, scramble_successes: 2, scramble_failures: 0, scrambling_percentage: 100 },
      ],
      [
        { round_index: 3, round_id: "c", opportunities: 1, successes: 0, percentage: 0 },
        { round_index: 1, round_id: "a", opportunities: 2, successes: 1, percentage: 50 },
      ],
    );
    expect(points).toEqual([
      { roundIndex: 1, roundId: "a", scrambling: 25, upAndDown: 50 },
      { roundIndex: 2, roundId: "b", scrambling: null, upAndDown: null },
      { roundIndex: 3, roundId: "c", scrambling: 100, upAndDown: 0 },
    ]);
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
