import { describe, expect, it } from "vitest";
import { sampleGolfer } from "@/testing/fixtures/sampleGolfer";
import { withoutRounds } from "@/testing/fakes/analyticsResponses";
import type { GirTrendRowDto } from "@/types/api";
import { playedCourseFrom } from "../analyticsRepository";
import { analyticsFrom, defaultRangePar, girSplitFrom, isFiltered, yardageBucketsFrom } from "../model";

const girRow = (round_index: number, gir_percentage: number | null): GirTrendRowDto => ({
  round_index,
  round_id: `round-${round_index}`,
  total_gir: gir_percentage == null ? null : Math.round((gir_percentage / 100) * 18),
  holes_played: 18,
  gir_percentage,
});

const noMix = { eagle: 0, birdie: 0, par: 0, bogey: 0, double: 0, triple: 0, quad: 0 };

describe("isFiltered", () => {
  it("counts a course or a timeframe, not the round count", () => {
    expect(isFiltered({ limit: 10, timeframe: "all", courseId: "all" })).toBe(false);
    expect(isFiltered({ limit: 50, timeframe: "ytd", courseId: "all" })).toBe(true);
    expect(isFiltered({ limit: 50, timeframe: "all", courseId: "home" })).toBe(true);
  });
});

describe("analyticsFrom", () => {
  const analytics = analyticsFrom(sampleGolfer.analytics);

  it("keeps the server's figures and counts its rounds", () => {
    expect(analytics.sections).toBe(sampleGolfer.analytics);
    expect(analytics.kpis).toBe(sampleGolfer.analytics.kpis);
    expect(analytics.roundCount).toBe(24);
  });

  it("draws the server's rolling average under each score", () => {
    expect(analytics.scoreTrend).toHaveLength(24);
    expect(analytics.scoreTrend[0].rolling_average).toBe(analytics.scoreTrend[0].total_score);
    expect(analytics.scoreTrend.at(-1)?.rolling_average).toBe(79);
  });

  it("takes the best score, the score mix and the insights as the server sent them", () => {
    expect(analytics.bestScore).toBe(75);
    expect(analytics.kpis.average_putts).toBe(32.7);
    expect(analytics.scoreMix).toEqual({ eagle: 0, birdie: 5.32, par: 42.36, bogey: 39.58, double: 11.81, triple: 0.93, quad: 0 });
    expect(analytics.insights).toBe(sampleGolfer.analytics.insights);
    expect(analytics.insights.map((insight) => insight.kind)).toEqual([
      "scoring_shift",
      "best_par",
      "gir_average",
      "gir_shift",
      "putts_average",
    ]);
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
      scoreMix: noMix,
      bestScore: null,
      insights: [],
    });
  });
});

describe("the kit's shapes", () => {
  const analytics = analyticsFrom(sampleGolfer.analytics);

  it("takes the best round the server picked", () => {
    expect(analytics.bestRound).toEqual({
      roundId: "8d412153-b640-567c-b361-5eb47ecb4efd",
      course: "Presidio Golf Course",
    });
    expect(analyticsFrom(withoutRounds(sampleGolfer.analytics)).bestRound).toBeNull();
  });

  it("keys the server's GIR split by score kind", () => {
    const [gir] = girSplitFrom(sampleGolfer.analytics.gir_vs_non_gir);
    const row = sampleGolfer.analytics.gir_vs_non_gir[0];
    expect(gir).toEqual({
      bucket: row.bucket,
      holes: row.holes_counted,
      mix: {
        eagle: row.eagle,
        birdie: row.birdie,
        par: row.par,
        bogey: row.bogey,
        double: row.double,
        triple: row.triple,
        quad: row.quad,
      },
    });
  });

  it("takes each yardage band's average and score mix from the server, in its order", () => {
    const [band] = yardageBucketsFrom([
      {
        par: 4,
        bucket_label: "400–449",
        bucket_order: 2,
        average_to_par: 0.5,
        average_strokes: 4.5,
        gir_percentage: 25,
        sample_size: 4,
        score_mix: { ...noMix, birdie: 25, par: 25, bogey: 25, double: 25 },
        raw_scores: [
          { to_par: -1, yardage: 410 },
          { to_par: 0, yardage: 420 },
          { to_par: 1, yardage: 430 },
          { to_par: 2, yardage: 440 },
        ],
      },
    ]);
    expect(band).toMatchObject({ label: "400–449", averageScore: 4.5, averageToPar: 0.5, girPercent: 25, holes: 4 });
    expect(band.results[0]).toEqual({ toPar: -1, yardage: 410 });
    expect(band.mix).toMatchObject({ birdie: 25, par: 25, bogey: 25, double: 25, eagle: 0 });
    expect(analytics.yardageBuckets.map((bucket) => bucket.label)).toEqual([
      "< 150",
      "150–199",
      "< 350",
      "350–399",
      "400–449",
      "< 500",
      "500–549",
    ]);
  });

  it("opens the range view on par 4s, else the first par with a band", () => {
    expect(defaultRangePar(analytics.yardageBuckets)).toBe(4);
    expect(defaultRangePar(analytics.yardageBuckets.filter((bucket) => bucket.par !== 4))).toBe(3);
    expect(defaultRangePar([])).toBe(4);
  });
});

describe("playedCourseFrom", () => {
  it("keeps a course without a name or location as null", () => {
    expect(playedCourseFrom({ id: "course-1", name: null, location: null })).toEqual({ id: "course-1", name: null, location: null });
  });
});
