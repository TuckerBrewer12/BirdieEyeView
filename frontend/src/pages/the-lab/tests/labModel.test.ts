import { describe, expect, it } from "vitest";
import { friendshipFromDto } from "@/data/friendsModel";
import { HANDICAP_BENCHMARK } from "@/domain";
import { populatedFriendships } from "@/testing/fixtures/friendships";
import { labAnalytics, labGoalReport } from "@/testing/fixtures/lab";
import {
  friendOptionsFrom,
  goalStandingFrom,
  labAnalyticsFrom,
  parTypeRowsFrom,
  peakGameFrom,
  puttingSummaryFrom,
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
      roundsMeetingGoal: null,
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

describe("the server's figures", () => {
  it("maps the server's peak game, with the goal report's gap, once a goal is set", () => {
    expect(peakGameFrom(labAnalytics, null, labGoalReport)).toBeNull();
    expect(peakGameFrom({ ...labAnalytics, peak_game: null }, 89, labGoalReport)).toBeNull();

    const peak = peakGameFrom(labAnalytics, 89, labGoalReport)!;
    expect(peak.rounds[0]).toEqual({ roundId: "lab-6", courseName: "Half Moon Bay", score: 89 });
    expect(peak.average).toBe(89.7);
    expect(peak.overallAverage).toBe(91.7);
    expect(peak.gapToGoal).toBe(0.7);
    // Before the goal's report loads, the peak stands without a gap.
    expect(peakGameFrom(labAnalytics, 89, null)?.gapToGoal).toBeNull();
  });

  it("takes the putting figures from the server, and the trend from its rows", () => {
    const putting = puttingSummaryFrom(labAnalytics);
    expect(putting).toMatchObject({ threePuttsPerRound: 2, threePuttRate: 11.1, puttsPerRound: 34.5 });
    expect(putting.puttsTrend).toHaveLength(12);
  });

  it("falls back to the window's lowest score from the server's records", () => {
    expect(labAnalyticsFrom(labAnalytics).lowestScore).toBe(89);
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
    const peak = peakGameFrom(labAnalytics, 89, labGoalReport)!;
    expect(peakGapNote(peak, "Break 90")).toBe("0.7 strokes from break 90 on your best days.");
    expect(peakGapNote({ ...peak, gapToGoal: -1 }, "Break 90")).toMatch(/already break 90/);
    expect(peakGapNote({ ...peak, gapToGoal: null }, "Break 90")).toBeNull();
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
