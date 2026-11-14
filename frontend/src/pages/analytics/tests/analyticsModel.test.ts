import { describe, expect, it } from "vitest";
import { sampleGolfer } from "@/testing/fixtures/sampleGolfer";
import { analyticsFrom, defaultApproachPar, isFiltered, tabFrom, yardageBucketsFrom, DEFAULT_FILTERS } from "../model";
import {
  benchmarkNote,
  bucketCards,
  scoreShown,
  trendLineOptions,
  countLines,
  courseOptions,
  difficultyColumns,
  headlineTiles,
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
    expect(scoring).toMatchObject({ label: "Scoring avg", value: "82.9", delta: "3.9", direction: "down", tone: "good" });
    expect(greens).toMatchObject({ label: "Greens hit", value: "33%", delta: "17", direction: "up" });
    const nine = headlineTiles([{ metric: "average_putts", value: 30, change: null, verdict: null, trend: [] }])[0];
    expect(nine).toMatchObject({ delta: "", direction: null, tone: "neutral" });
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

  it("puts each par type on one scale with the benchmark's tick", () => {
    const bars = parTypeBars(analytics.parTypes);
    expect(bars.map((bar) => bar.label)).toEqual(["Par 3", "Par 4", "Par 5"]);
    expect(bars[0]).toMatchObject({ value: "+0.63", tone: "bad", mark: 10 });
    expect(parTypeBars([{ par: 4, averageToPar: 0.5, benchmarkToPar: 0.5, gap: 0, verdict: "even" }])[0].tone).toBe("primary");
    expect(parTypeBars([{ par: 4, averageToPar: 0.4, benchmarkToPar: null, gap: null, verdict: null }])[0].tone).toBe("primary");
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
    expect(cards.filter((card) => card.tone === "bad")).toHaveLength(1);
  });

  it("offers every course, the home course, then each one played", () => {
    expect(courseOptions([{ id: "c1", name: null, location: null }], true).map((option) => option.label)).toEqual([
      "All courses",
      "Home course",
      "Unknown course",
    ]);
  });

  it("offers the score, then the kinds of hole any round shown had, and counts each round's, triples and worse as one", () => {
    const counts = (birdie: number, triple: number, quad: number) => ({ eagle: 0, birdie, par: 10, bogey: 4, double: 2, triple, quad });
    const points = [
      { value: 84, rollingAverage: 84, course: null, counts: counts(1, 1, 0) },
      { value: 86, rollingAverage: 85, course: null, counts: counts(0, 0, 1) },
      { value: 90, rollingAverage: 86.7, course: null, counts: null },
    ];
    expect(trendLineOptions(points).map((option) => option.label)).toEqual([
      "Score",
      "Birdies",
      "Pars",
      "Bogeys",
      "Doubles",
      "Triples+",
    ]);
    expect(scoreShown(["birdie"])).toBe(false);
    expect(countLines(points, ["triple", "score", "birdie", "eagle"])).toEqual([
      { kind: "birdie", label: "Birdies", values: [1, 0, null] },
      { kind: "triple", label: "Triples+", values: [1, 1, null] },
    ]);
  });

  it("gives a net round the holes of its score row", () => {
    const data = sampleGolfer.analytics;
    const analytics = analyticsFrom(data);
    const rated = data.net_score_trend.find((row) => row.net_score != null)!;
    const scored = data.score_trend.find((row) => row.round_id === rated.round_id)!;
    expect(analytics.netTrend[0].counts).toEqual(scored.score_counts);
  });
});
