import { describe, expect, it } from "vitest";
import { friendshipFromDto } from "@/data/friendsModel";
import { benchmarkComparisonFrom } from "@/domain";
import { populatedFriendships } from "@/testing/fixtures/friendships";
import { labAnalytics, labBenchmarks, labGoalReport } from "@/testing/fixtures/lab";
import {
  friendOptionsFrom,
  goalStandingFrom,
  labAnalyticsFrom,
  peakGameFrom,
  puttingSummaryFrom,
} from "../model";
import {
  benchmarkHeading,
  benchmarkName,
  comparisonFromKey,
  comparisonKey,
  comparisonOptions,
  goalStandingNote,
  parTypeGapNote,
  peakGapNote,
  recentTrendNote,
  signedStrokes,
} from "../present";

const { handicaps } = benchmarkComparisonFrom(labBenchmarks.alone);

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
      lowestScore: null,
      roundsMeetingGoal: null,
      attempts: [],
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

  it("takes the golfer's shape as the server worked it out", () => {
    expect(labAnalyticsFrom(labAnalytics).shape).toEqual({
      girPct: 28,
      scramblingPct: 22,
      puttsPerGir: 2.05,
      par3ToPar: 0.92,
      par4ToPar: 1.12,
      par5ToPar: 0.85,
    });
    expect(labAnalyticsFrom({ ...labAnalytics, shape: null }).shape).toBeNull();
  });
});

describe("present", () => {
  it("offers no comparison, each handicap the server has a benchmark for, then a friend", () => {
    expect(comparisonOptions(handicaps).map((option) => option.label)).toEqual([
      "Just me",
      "Scratch",
      "Breaks 80",
      "Breaks 85",
      "Breaks 90",
      "Breaks 95",
      "Breaks 100",
      "A friend",
    ]);
  });

  it("round-trips a comparison through its toggle key", () => {
    const options = comparisonOptions(handicaps);
    for (const value of [null, 0, 15, "friend"] as const) {
      expect(comparisonFromKey(comparisonKey(value), options)).toEqual({ value });
    }
    expect(comparisonFromKey(undefined, options)).toBeNull();
    expect(comparisonFromKey("7", options)).toBeNull();
  });

  it("names what the golfer is compared with", () => {
    const avery = { id: "user-avery", name: "Avery Lin" };
    expect(benchmarkName("peak", 5, avery, handicaps)).toBe("Your peak game");
    expect(benchmarkName("benchmark", "friend", avery, handicaps)).toBe("Avery Lin");
    expect(benchmarkName("benchmark", 5, null, handicaps)).toBe("Breaks 80");
    expect(benchmarkName("benchmark", 0, null, handicaps)).toBe("Scratch");
    expect(benchmarkName("benchmark", null, null, handicaps)).toBeNull();
    // Before the server's handicaps load, a handicap has no name yet.
    expect(benchmarkName("benchmark", 5, null, [])).toBeNull();
    expect(benchmarkHeading("benchmark", 15, null, null, handicaps)).toBe("You vs. Break-90 Shape");
    expect(benchmarkHeading("benchmark", 0, null, null, handicaps)).toBe("You vs. Scratch");
    expect(benchmarkHeading("benchmark", "friend", { id: "x", name: null }, null, handicaps)).toBe(
      "You vs. Unknown golfer",
    );
  });

  it("words the goal and peak gaps", () => {
    const goal = goalStandingFrom(89, labGoalReport)!;
    expect(goalStandingNote(goal)).toBe("2.7 strokes a round to go.");
    expect(goalStandingNote({ ...goal, onTrack: true })).toBe("Your average already breaks 90. Keep it there.");
    const peak = peakGameFrom(labAnalytics, 89, labGoalReport)!;
    expect(peakGapNote(peak, "Break 90")).toBe("0.7 strokes from break 90 on your best days.");
    expect(peakGapNote({ ...peak, gapToGoal: -1, meetsGoal: true }, "Break 90")).toMatch(/already break 90/);
    expect(peakGapNote({ ...peak, gapToGoal: null, meetsGoal: null }, "Break 90")).toBeNull();
  });

  it("words a par-type gap in the server's verdict", () => {
    const [par3, , par5] = benchmarkComparisonFrom(labBenchmarks["handicap:15"]).parTypes;
    expect(parTypeGapNote(par3, "Breaks 90")).toEqual({ text: "Breaks 90 +0.6 · 0.32 a hole to close", gap: 0.32 });
    expect(parTypeGapNote(par5, "Breaks 90")?.text).toBe("Breaks 90 +1.1 · ahead of it");
    const even = { par: 4 as const, averageToPar: 1, benchmarkToPar: 1.004, gap: 0, verdict: "even" as const };
    expect(parTypeGapNote(even, "Breaks 90")).toEqual({ text: "Breaks 90 +1 · even with it", gap: 0 });
    expect(parTypeGapNote(benchmarkComparisonFrom(labBenchmarks.alone).parTypes[0], "Breaks 90")).toBeNull();
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
