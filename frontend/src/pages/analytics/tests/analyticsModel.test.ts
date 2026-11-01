import { describe, expect, it } from "vitest";
import { sampleGolfer } from "@/testing/fixtures/sampleGolfer";
import { withoutRounds } from "@/testing/fakes/analyticsResponses";
import type { GIRTrendRow, PuttsTrendRow, ScoreTrendRow, ScoreTypeRow } from "@/types/analytics";
import { playedCourseFrom } from "../analyticsRepository";
import {
  analyticsFrom,
  bestScoreFrom,
  insightCategory,
  insightsFrom,
  isFiltered,
  recentRateFrom,
  scoreMixFrom,
  shortGameTrendFrom,
} from "../model";

const scoreRow = (round_index: number, total_score: number | null): ScoreTrendRow => ({
  round_index,
  round_id: `round-${round_index}`,
  total_score,
  to_par: null,
  course_name: null,
});

const girRow = (round_index: number, gir_percentage: number | null): GIRTrendRow => ({
  round_index,
  round_id: `round-${round_index}`,
  total_gir: gir_percentage == null ? null : Math.round((gir_percentage / 100) * 18),
  holes_played: 18,
  gir_percentage,
});

const puttsRow = (round_index: number, total_putts: number | null): PuttsTrendRow => ({
  round_index,
  round_id: `round-${round_index}`,
  total_putts,
  holes_played: 18,
});

const mixRow = (holes_counted: number, shares: Partial<ScoreTypeRow>): ScoreTypeRow => ({
  round_index: 1,
  round_id: "round-1",
  holes_counted,
  eagle: 0,
  birdie: 0,
  par: 0,
  bogey: 0,
  double_bogey: 0,
  triple_bogey: 0,
  quad_bogey: 0,
  ...shares,
});

describe("isFiltered", () => {
  it("counts a course or a timeframe, not the round count", () => {
    expect(isFiltered({ limit: 10, timeframe: "all", courseId: "all" })).toBe(false);
    expect(isFiltered({ limit: 50, timeframe: "ytd", courseId: "all" })).toBe(true);
    expect(isFiltered({ limit: 50, timeframe: "all", courseId: "home" })).toBe(true);
  });
});

describe("scoreMixFrom", () => {
  it("weights each round by the holes it counted and drops types never made", () => {
    const mix = scoreMixFrom([
      mixRow(18, { par: 50, bogey: 50 }),
      mixRow(9, { birdie: 100 }),
      mixRow(0, { eagle: 100 }),
    ]);
    expect(mix).toEqual([
      { name: "birdie", value: 33.3 },
      { name: "par", value: 33.3 },
      { name: "bogey", value: 33.3 },
    ]);
  });

  it("is empty without a counted hole", () => {
    expect(scoreMixFrom([mixRow(0, { par: 100 })])).toEqual([]);
  });
});

describe("bestScoreFrom", () => {
  it("is the lowest score, skipping rounds without one", () => {
    expect(bestScoreFrom([scoreRow(1, 84), scoreRow(2, null), scoreRow(3, 79)])).toBe(79);
    expect(bestScoreFrom([scoreRow(1, null)])).toBeNull();
  });
});

describe("recentRateFrom", () => {
  it("averages the last five rates and compares them to the five before", () => {
    const rates = [10, 20, 30, 40, 50, null, 60, 70, 80, 90, 100];
    expect(recentRateFrom(rates)).toEqual({ percent: 80, change: 50 });
  });

  it("has no change until there are six rates", () => {
    expect(recentRateFrom([40, null, 60])).toEqual({ percent: 50, change: null });
    expect(recentRateFrom([])).toEqual({ percent: null, change: null });
  });
});

describe("shortGameTrendFrom", () => {
  it("puts each round's up-and-down rate beside its scrambling rate", () => {
    const trend = shortGameTrendFrom(
      [
        { round_index: 1, round_id: "a", scramble_opportunities: 4, scramble_successes: 1, scramble_failures: 3, scrambling_percentage: 25 },
        { round_index: 2, round_id: "b", scramble_opportunities: 0, scramble_successes: 0, scramble_failures: 0, scrambling_percentage: null },
      ],
      [{ round_index: 1, round_id: "a", opportunities: 2, successes: 1, percentage: 50 }],
    );
    expect(trend.map((row) => [row.scrambling_percentage, row.up_and_down_pct])).toEqual([
      [25, 50],
      [null, null],
    ]);
  });
});

describe("insightsFrom", () => {
  it("notices scores coming down between the two halves", () => {
    const scores = [90, 90, 90, 80, 80, 80].map((score, i) => scoreRow(i + 1, score));
    expect(insightsFrom(scores, [], [], [])).toEqual([{ kind: "scoring-shift", strokes: 10, rounds: 6 }]);
  });

  it("stays quiet about scoring under six rounds or a shift under 0.3", () => {
    const short = [90, 80, 70].map((score, i) => scoreRow(i + 1, score));
    const steady = [80, 80, 80, 80, 80, 80.2].map((score, i) => scoreRow(i + 1, score));
    expect(insightsFrom(short, [], [], [])).toEqual([]);
    expect(insightsFrom(steady, [], [], [])).toEqual([]);
  });

  it("picks the par type played best", () => {
    const byPar = [
      { par: 3, average_to_par: 0.6, average_strokes: 3.6, sample_size: 20 },
      { par: 5, average_to_par: 0.1, average_strokes: 5.1, sample_size: 12 },
    ];
    expect(insightsFrom([], [], byPar, [])).toEqual([{ kind: "best-par", par: 5, averageToPar: 0.1, holes: 12 }]);
  });

  it("averages GIR and putts over the rounds that have them, and spots their shifts", () => {
    const gir = [20, null, 20, 40, 40].map((pct, i) => girRow(i + 1, pct));
    const putts = [36, 36, null, 32, 32].map((count, i) => puttsRow(i + 1, count));
    const insights = insightsFrom([], gir, [], putts);
    expect(insights).toEqual([
      { kind: "gir-average", percent: 30 },
      { kind: "gir-shift", points: 20 },
      { kind: "putts-average", putts: 34 },
      { kind: "putts-shift", putts: 4 },
    ]);
    expect(insights.map(insightCategory)).toEqual(["gir", "gir", "putting", "putting"]);
  });
});

describe("analyticsFrom", () => {
  const analytics = analyticsFrom(sampleGolfer.analytics);

  it("keeps the server's figures and counts its rounds", () => {
    expect(analytics.sections).toBe(sampleGolfer.analytics);
    expect(analytics.kpis).toBe(sampleGolfer.analytics.kpis);
    expect(analytics.roundCount).toBe(24);
  });

  it("draws a rolling average under each score", () => {
    expect(analytics.scoreTrend).toHaveLength(24);
    expect(analytics.scoreTrend[0].rolling_avg).toBe(analytics.scoreTrend[0].total_score);
    expect(analytics.scoreTrend.every((row) => row.rolling_avg != null)).toBe(true);
  });

  it("works out the best score, average putts and a score mix of every hole", () => {
    expect(analytics.bestScore).toBe(75);
    expect(analytics.averagePutts).toBeCloseTo(32.67, 2);
    const total = analytics.scoreMix.reduce((sum, share) => sum + share.value, 0);
    expect(total).toBeGreaterThan(99.5);
    expect(total).toBeLessThan(100.5);
  });

  it("keeps three-putt counts only for rounds with putts recorded", () => {
    const withoutPutts = {
      ...sampleGolfer.analytics,
      putts_trend: sampleGolfer.analytics.putts_trend.map((row, i) => (i === 0 ? { ...row, total_putts: null } : row)),
    };
    const trimmed = analyticsFrom(withoutPutts);
    expect(trimmed.puttsTrend).toHaveLength(23);
    expect(trimmed.threePuttTrend).toHaveLength(23);
    expect(trimmed.threePuttTrend[0].round_index).toBe(2);
  });

  it("says when rounds without greens sit out of the GIR chart", () => {
    expect(analytics.girRoundsLeftOut).toBe(false);
    const missing = analyticsFrom({
      ...sampleGolfer.analytics,
      gir_trend: [girRow(1, null), ...sampleGolfer.analytics.gir_trend],
    });
    expect(missing.girRoundsLeftOut).toBe(true);
    expect(missing.girTrend).toHaveLength(24);
  });

  it("is all empty for a filter no round matches", () => {
    const empty = analyticsFrom(withoutRounds(sampleGolfer.analytics));
    expect(empty).toMatchObject({
      roundCount: 0,
      scoreTrend: [],
      scoreMix: [],
      bestScore: null,
      averagePutts: null,
      insights: [],
      scrambling: { percent: null, change: null },
    });
  });
});

describe("playedCourseFrom", () => {
  it("keeps a course without a name or location as null", () => {
    expect(playedCourseFrom({ id: "course-1", name: null, location: null })).toEqual({ id: "course-1", name: null, location: null });
  });
});
