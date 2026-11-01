import { describe, expect, it } from "vitest";
import { friendshipFromDto } from "@/data/friendsModel";
import { HANDICAP_BENCHMARK } from "@/domain";
import { populatedFriendships } from "@/testing/fixtures/friendships";
import { labAnalytics, labGoalReport } from "@/testing/fixtures/lab";
import {
  friendOptionsFrom,
  goalStandingFrom,
  parTypeRowsFrom,
  peakGameFrom,
  peakImpactsFrom,
  peakVsAverageFrom,
  puttingSummaryFrom,
  recentTrendFrom,
  roundsMeetingGoal,
  type LabAnalytics,
} from "../model";
import {
  benchmarkHeading,
  benchmarkName,
  comparisonFromKey,
  comparisonKey,
  goalStandingNote,
  parTypeGapNote,
  peakGapNote,
  recentTrendNote,
  signedStrokes,
} from "../present";

const withScores = (scores: (number | null)[], average: number | null = 90): LabAnalytics => ({
  ...labAnalytics,
  kpis: { ...labAnalytics.kpis, scoring_average: average },
  score_trend: scores.map((total_score, i) => ({
    round_index: i + 1,
    round_id: `r-${i + 1}`,
    course_name: null,
    total_score,
    to_par: null,
  })),
});

describe("goalStandingFrom", () => {
  it("is null with no goal", () => {
    expect(goalStandingFrom(null, labGoalReport)).toBeNull();
  });

  it("stands the goal with no figures before the report loads", () => {
    expect(goalStandingFrom(79, null)).toEqual({
      target: 79,
      average: null,
      gap: null,
      progressPct: null,
      onTrack: false,
      bestScore: null,
      savers: [],
    });
  });

  it("keeps the server's savers as they came", () => {
    const savers = goalStandingFrom(89, labGoalReport)!.savers;
    expect(savers[1]).toEqual({
      kind: "blowup_holes",
      strokesSaved: 0.9,
      shareOfGap: 33,
      headline: labGoalReport.savers[1].headline,
      detail: labGoalReport.savers[1].detail,
    });
  });
});

describe("friendOptionsFrom", () => {
  it("lists accepted friends once each, by name", () => {
    const friendships = populatedFriendships.map((dto) => friendshipFromDto(dto, "user-1"));
    const twice = [...friendships, ...friendships];
    expect(friendOptionsFrom(twice).map((f) => f.name)).toEqual(["Avery Lin", "Jordan Castellanos"]);
  });
});

describe("the window's own figures", () => {
  it("counts the rounds at or under the goal, skipping unscored ones", () => {
    expect(roundsMeetingGoal(withScores([90, 89, null, 85]), 89)).toBe(2);
  });

  it("puts the last five rounds against the average, once there are five", () => {
    expect(recentTrendFrom(withScores([90, 90, 90, 90]))).toBeNull();
    expect(recentTrendFrom(withScores([100, 88, 88, 88, 88, 88], 90))).toBe(-2);
  });

  it("takes the best three rounds as the peak game, once a goal is set", () => {
    const analytics = withScores([95, 88, 91, 86, 99]);
    expect(peakGameFrom(analytics, null)).toBeNull();
    expect(peakGameFrom(withScores([88]), 89)).toBeNull();

    const peak = peakGameFrom(analytics, 84)!;
    expect(peak.rounds.map((r) => r.score)).toEqual([86, 88, 91]);
    expect(peak.average).toBeCloseTo(88.33, 2);
    expect(peak.gapToGoal).toBeCloseTo(4.33, 2);
  });

  it("works out birdies, bogeys and doubles a round in the peak against all", () => {
    const peak = peakGameFrom(labAnalytics, 89)!;
    const comparison = peakVsAverageFrom(labAnalytics, peak)!;
    // lab-6 had two birdies, lab-5 and lab-11 one each.
    expect(comparison.peak.birdies).toBeCloseTo(4 / 3, 1);
    expect(comparison.average.birdies).toBeCloseTo(9 / 12, 1);

    const [birdies, bogeys, doubles] = peakImpactsFrom(comparison);
    expect(birdies.strokes).toBeGreaterThan(0);
    expect(bogeys.strokes).toBeCloseTo(-(comparison.peak.bogeys - comparison.average.bogeys), 5);
    expect(doubles.strokes).toBeCloseTo(-2 * (comparison.peak.doubles - comparison.average.doubles), 5);
  });

  it("has no peak comparison without score types", () => {
    const analytics = { ...labAnalytics, score_type_distribution: [] };
    expect(peakVsAverageFrom(analytics, peakGameFrom(analytics, 89))).toBeNull();
  });

  it("averages the putting figures", () => {
    const putting = puttingSummaryFrom(labAnalytics);
    expect(putting.threePuttsPerRound).toBe(2);
    expect(putting.puttsPerRound).toBeCloseTo(34.5, 1);
    expect(putting.puttsTrend).toHaveLength(12);
  });

  it("reads each par type against the comparison's average to par", () => {
    const rows = parTypeRowsFrom(labAnalytics, HANDICAP_BENCHMARK[0]);
    expect(rows.map((r) => r.averageToPar)).toEqual([0.92, 1.12, 0.85]);
    // Scratch's par 3 score of 81 stands for about +0.0 a hole.
    expect(rows[0].benchmarkToPar).toBeCloseTo(-0.025, 3);
    expect(parTypeRowsFrom(labAnalytics, null).every((r) => r.benchmarkToPar == null)).toBe(true);
  });
});

describe("present", () => {
  it("round-trips a comparison through its toggle key", () => {
    for (const value of [null, 0, 15, "friend"] as const) {
      expect(comparisonFromKey(comparisonKey(value))).toEqual({ value });
    }
    expect(comparisonFromKey(undefined)).toBeNull();
  });

  it("names what the golfer is compared with", () => {
    const avery = { id: "user-avery", name: "Avery Lin" };
    expect(benchmarkName("peak", 5, avery)).toBe("Your peak game");
    expect(benchmarkName("benchmark", "friend", avery)).toBe("Avery Lin");
    expect(benchmarkName("benchmark", 5, null)).toBe("Breaks 80");
    expect(benchmarkName("benchmark", null, null)).toBeNull();
    expect(benchmarkHeading("benchmark", 15, null, null)).toBe("You vs. Break-90 Shape");
    expect(benchmarkHeading("benchmark", "friend", { id: "x", name: null }, null)).toBe("You vs. Unknown golfer");
  });

  it("words the goal and peak gaps", () => {
    const goal = goalStandingFrom(89, labGoalReport)!;
    expect(goalStandingNote(goal)).toBe("2.7 strokes a round to go.");
    expect(goalStandingNote({ ...goal, onTrack: true })).toBe("Your average already breaks 90. Keep it there.");
    const peak = peakGameFrom(labAnalytics, 89)!;
    expect(peakGapNote(peak, "Break 90")).toBe("0.7 strokes from break 90 on your best days.");
    expect(peakGapNote({ ...peak, gapToGoal: -1 }, "Break 90")).toMatch(/already break 90/);
  });

  it("words a par-type gap, and a tie is even", () => {
    expect(parTypeGapNote(1.2, 1, "Breaks 90")).toEqual({
      text: "Breaks 90 +1 · 0.20 a hole to close",
      gap: 0.2,
    });
    expect(parTypeGapNote(0.8, 1, "Breaks 90").text).toBe("Breaks 90 +1 · ahead of it");
    expect(parTypeGapNote(1, 1, "Breaks 90")).toEqual({ text: "Breaks 90 +1 · even with it", gap: 0 });
    // A difference that rounds to even is a tie, not ahead.
    expect(parTypeGapNote(1, 1.004, "Breaks 90").text).toBe("Breaks 90 +1 · even with it");
  });

  it("words strokes and trends with their sign", () => {
    expect(signedStrokes(1.23)).toEqual({ text: "+1.2 strokes", tone: "text-score-birdie" });
    expect(signedStrokes(-0.44)).toEqual({ text: "-0.4 strokes", tone: "text-score-bogey" });
    expect(signedStrokes(0.04).tone).toBe("text-score-birdie");
    expect(signedStrokes(0).tone).toBe("text-muted-foreground");
    expect(recentTrendNote(0.5)).toBe("Trending 0.5 strokes above your 20-round average.");
    expect(recentTrendNote(-1)).toBe("Trending 1.0 strokes below your 20-round average.");
  });
});
