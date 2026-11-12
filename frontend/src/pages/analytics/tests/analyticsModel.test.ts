import { describe, expect, it } from "vitest";
import { sampleGolfer } from "@/testing/fixtures/sampleGolfer";
import { analyticsFrom, defaultApproachPar, isFiltered, tabFrom, yardageBucketsFrom, DEFAULT_FILTERS } from "../model";
import {
  benchmarkNote,
  bucketCards,
  courseOptions,
  difficultyColumns,
  headlineTiles,
  mixLegend,
  mixSegments,
  parTypeBars,
  puttsPerHoleSegments,
  seriesPoints,
  shortGameBars,
  threePuttColumns,
} from "../present";

const analytics = analyticsFrom(sampleGolfer.analytics);

describe("analyticsFrom", () => {
  it("takes the server's figures as they came", () => {
    expect(analytics.roundCount).toBe(24);
    expect(analytics.headline).toBe(sampleGolfer.analytics.headline);
    expect(analytics.benchmarkHandicap).toBe(sampleGolfer.analytics.next_level_handicap);
    expect(analytics.puttsPerHole).toEqual({ holes: 432, oneOrFewer: 31.71, two: 55.09, threeOrMore: 13.19 });
    expect(analytics.shortGame.tourScrambling).toBe(57);
  });

  it("keeps each round's figure beside the server's five-round average, skipping rounds without it", () => {
    expect(analytics.scoreTrend).toHaveLength(24);
    expect(analytics.scoreTrend[0]).toMatchObject({
      value: sampleGolfer.analytics.score_trend[0].total_score,
      rollingAverage: sampleGolfer.analytics.score_trend[0].rolling_average,
    });
    const withPutts = sampleGolfer.analytics.putts_trend.filter((row) => row.total_putts != null);
    expect(analytics.puttsTrend).toHaveLength(withPutts.length);
    expect(analytics.threePutts).toHaveLength(withPutts.length);
  });

  it("keeps the server's marks: the hardest holes and the worst band", () => {
    expect(analytics.holeDifficulty.filter((hole) => hole.hardest)).toHaveLength(3);
    const worst = analytics.yardageBuckets.filter((bucket) => bucket.worst);
    expect(new Set(worst.map((bucket) => bucket.par)).size).toBe(worst.length);
  });

  it("opens Approach on par 4s, else the first par with a band", () => {
    expect(defaultApproachPar(analytics.yardageBuckets)).toBe(4);
    expect(defaultApproachPar(yardageBucketsFrom(sampleGolfer.analytics.scoring_by_yardage.filter((row) => row.par === 3)))).toBe(3);
    expect(defaultApproachPar([])).toBe(4);
  });

  it("narrows by course, not by the round count", () => {
    expect(isFiltered(DEFAULT_FILTERS)).toBe(false);
    expect(isFiltered({ ...DEFAULT_FILTERS, limit: 10 })).toBe(false);
    expect(isFiltered({ ...DEFAULT_FILTERS, courseId: "home" })).toBe(true);
  });

  it("reads a section from the address", () => {
    expect(tabFrom("profile")).toBe("profile");
    expect(tabFrom("lab")).toBeNull();
    expect(tabFrom(null)).toBeNull();
  });
});

describe("present", () => {
  it("words each headline tile with its move", () => {
    const [scoring, greens] = headlineTiles(analytics.headline);
    expect(scoring).toMatchObject({ label: "Scoring avg", value: "82.9", change: "3.9", direction: "down", tone: "good" });
    expect(greens).toMatchObject({ label: "Greens hit", value: "33%", change: "17", direction: "up" });
    // Under five rounds there is no move to show.
    const nine = headlineTiles([{ metric: "average_putts", value: 30, change: null, verdict: null, trend: [] }])[0];
    expect(nine).toMatchObject({ change: null, direction: null, tone: "neutral" });
  });

  it("draws a figure each round with its five-round average under the hover", () => {
    const [first] = seriesPoints([{ value: 84, rollingAverage: 84, course: "Muni" }], String);
    expect(first).toEqual({
      tick: 1,
      title: "Round 1",
      subtitle: "Muni",
      values: [84, 84],
      notes: [{ label: "5-round avg", value: "84" }],
    });
  });

  it("folds triples and worse into one share, and leaves empty kinds out of the legend", () => {
    const mix = { eagle: 0, birdie: 5, par: 42, bogey: 40, double: 12, triple: 0.6, quad: 0.4 };
    expect(mixSegments(mix).at(-1)).toMatchObject({ key: "triple", share: 1, label: "Triple+" });
    expect(mixLegend(mix, true).map((item) => `${item.label} ${item.figure}`)).toEqual([
      "Birdie 5%",
      "Par 42%",
      "Bogey 40%",
      "Double 12%",
      "Triple+ 1%",
    ]);
  });

  it("puts each par type on one scale with the benchmark's tick", () => {
    const bars = parTypeBars(analytics.parTypes);
    expect(bars.map((bar) => bar.label)).toEqual(["Par 3", "Par 4", "Par 5"]);
    expect(bars[0]).toMatchObject({ value: "+0.63", verdict: "behind", mark: 10 });
    expect(benchmarkNote(5)).toBe("Tick = 5 handicap");
    expect(benchmarkNote(0)).toBe("Tick = scratch");
    expect(benchmarkNote(null)).toBeNull();
  });

  it("columns the holes and rounds, marking what the server marked", () => {
    expect(difficultyColumns(analytics.holeDifficulty).filter((column) => column.marked)).toHaveLength(3);
    expect(threePuttColumns([{ count: 3, costly: true }, { count: 0, costly: false }])).toEqual([
      { key: "0", value: 3, marked: true },
      { key: "1", value: 0, marked: false },
    ]);
  });

  it("words the short game against the tour, and the putts a hole", () => {
    expect(shortGameBars(analytics.shortGame)[0]).toMatchObject({ label: "Scrambling", tour: "57%", mark: 57 });
    expect(puttsPerHoleSegments(analytics.puttsPerHole).map((segment) => segment.label)).toEqual([
      "1 putt",
      "2 putts",
      "3+ putts",
    ]);
  });

  it("cards each band of the picked par", () => {
    const cards = bucketCards(analytics.yardageBuckets, 4);
    expect(cards.length).toBeGreaterThan(0);
    expect(cards.every((card) => card.key.startsWith("4-"))).toBe(true);
    expect(cards.filter((card) => card.worst)).toHaveLength(1);
  });

  it("offers every course, the home course, then each one played", () => {
    expect(courseOptions([{ id: "c1", name: null, location: null }], true).map((option) => option.label)).toEqual([
      "All courses",
      "Home course",
      "Unnamed course",
    ]);
  });
});
