import { describe, expect, it } from "vitest";
import { sampleGolfer } from "@/testing/fixtures/sampleGolfer";
import { withoutRounds } from "@/testing/fakes/analyticsResponses";
import { analyticsFrom } from "../model";
import {
  averageReference,
  courseOptions,
  emptyMessage,
  handicapBars,
  headlineFigures,
  leadNarrative,
  narrativeFor,
  narrativeTone,
  netScorePoints,
  parBars,
  scoreTrendPoints,
  shortGamePoints,
  tabNarrative,
} from "../present";

describe("the layouts' words", () => {
  const analytics = analyticsFrom(sampleGolfer.analytics);

  it("offers every course, the home course when there is one, then each course played", () => {
    const courses = [
      { id: "c1", name: "Presidio Golf Course", location: null },
      { id: "c2", name: null, location: null },
    ];
    expect(courseOptions(courses, true)).toEqual([
      { value: "all", label: "All Courses" },
      { value: "home", label: "Home Course" },
      { value: "c1", label: "Presidio Golf Course" },
      { value: "c2", label: "Unnamed Course" },
    ]);
    expect(courseOptions([], false)).toEqual([{ value: "all", label: "All Courses" }]);
  });

  it("words the headline figures, with the best round's course under it", () => {
    expect(headlineFigures(analytics)).toEqual([
      { label: "Handicap Index", value: "7.0" },
      { label: "Rounds", value: "24" },
      { label: "Scoring Avg", value: "82.9" },
      { label: "Best Round", value: "75", detail: "Presidio Golf Course" },
      { label: "Avg Putts", value: "32.7" },
    ]);
    expect(headlineFigures(analyticsFrom(withoutRounds(sampleGolfer.analytics))).map((kpi) => kpi.value)).toEqual([
      "7.0",
      "0",
      "—",
      "—",
      "—",
    ]);
  });

  it("names each round on the trends, with the score's rolling average beside it", () => {
    const [first] = scoreTrendPoints(analytics.scoreTrend);
    expect(first).toEqual({
      tick: 1,
      title: "Round 1",
      subtitle: analytics.scoreTrend[0].course_name,
      values: [analytics.scoreTrend[0].total_score, analytics.scoreTrend[0].rolling_avg],
    });
    expect(shortGamePoints(analytics.shortGameTrend)[0].values).toHaveLength(2);
    expect(averageReference(82.9)).toEqual({ value: 82.9, label: "Avg 82.9" });
    expect(averageReference(null)).toBeNull();
  });

  it("puts gross, to par and course handicap under each net score", () => {
    const [point] = netScorePoints([
      { round_index: 3, round_id: "r3", course_name: "Presidio", gross_score: 80, net_score: 73, to_par: 8, course_handicap: -2 },
    ]);
    expect(point.notes).toEqual([
      { label: "Gross", value: "80" },
      { label: "To Par", value: "+8" },
      { label: "Course HCP", value: "+2" },
    ]);
  });

  it("labels the to-par bars by par type and by hole handicap", () => {
    expect(parBars([{ par: 3, average_to_par: 0.6, average_strokes: 3.6, sample_size: 20 }])).toEqual([
      { label: "Par 3", toPar: 0.6, detail: "20 holes" },
    ]);
    expect(handicapBars([{ handicap: 7, average_to_par: -0.1, sample_size: 1 }])).toEqual([
      { label: "7", toPar: -0.1, detail: "1 hole" },
    ]);
  });
});

describe("narrativeFor", () => {
  it("words a scoring shift by its direction", () => {
    expect(narrativeFor({ kind: "scoring-shift", strokes: 2.04, rounds: 24 })).toEqual({
      text: "Your scoring average has improved by 2.0 strokes over the last 24 rounds.",
      trend: "down",
      positiveUp: false,
    });
    expect(narrativeFor({ kind: "scoring-shift", strokes: -1.26, rounds: 8 }).text).toBe(
      "Your scoring average has climbed by 1.3 strokes recently — worth monitoring.",
    );
  });

  it("signs the best par type's average to par", () => {
    expect(narrativeFor({ kind: "best-par", par: 5, averageToPar: 0.4, holes: 12 }).text).toBe(
      "You score best on par 5s — averaging +0.4 across 12 holes.",
    );
    expect(narrativeFor({ kind: "best-par", par: 3, averageToPar: -0.1, holes: 8 })).toMatchObject({
      text: "You score best on par 3s — averaging -0.1 across 8 holes.",
      trend: "down",
    });
    expect(narrativeFor({ kind: "best-par", par: 4, averageToPar: 0.587500001, holes: 240 }).text).toBe(
      "You score best on par 4s — averaging +0.59 across 240 holes.",
    );
    expect(narrativeFor({ kind: "best-par", par: 4, averageToPar: 0.001, holes: 9 }).text).toBe(
      "You score best on par 4s — averaging E across 9 holes.",
    );
  });

  it("grades the GIR and putting averages", () => {
    expect(narrativeFor({ kind: "gir-average", percent: 60 }).text).toMatch(/excellent ball striking/);
    expect(narrativeFor({ kind: "gir-average", percent: 40 }).text).toMatch(/fastest routes/);
    expect(narrativeFor({ kind: "gir-average", percent: 20 }).text).toMatch(/irons are the area/);
    expect(narrativeFor({ kind: "putts-average", putts: 29 }).text).toMatch(/outstanding/);
    expect(narrativeFor({ kind: "putts-average", putts: 33 })).toMatchObject({ trend: "flat" });
    expect(narrativeFor({ kind: "putts-average", putts: 37 })).toMatchObject({ trend: "up" });
  });

  it("words GIR and putting shifts", () => {
    expect(narrativeFor({ kind: "gir-shift", points: 6.4 }).text).toBe(
      "GIR% trending up 6 points over recent rounds — ball striking improving.",
    );
    expect(narrativeFor({ kind: "gir-shift", points: -3 })).toMatchObject({ trend: "down", positiveUp: true });
    expect(narrativeFor({ kind: "putts-shift", putts: 1.5 }).text).toBe(
      "Putts per round improving — down 1.5 strokes on average.",
    );
    expect(narrativeFor({ kind: "putts-shift", putts: -0.8 }).text).toBe("Putts per round up 0.8 strokes recently.");
  });
});

describe("leadNarrative", () => {
  it("is the first insight in the category, or null", () => {
    const insights = [
      { kind: "gir-average", percent: 40 },
      { kind: "putts-average", putts: 33 },
      { kind: "putts-shift", putts: 1 },
    ] as const;
    expect(leadNarrative([...insights], "putting")?.text).toMatch(/^Averaging 33.0 putts/);
    expect(leadNarrative([...insights], "scoring")).toBeNull();
  });
});

describe("tabNarrative", () => {
  const insights = [
    { kind: "best-par", par: 4, averageToPar: 0.5, holes: 40 },
    { kind: "gir-average", percent: 40 },
    { kind: "putts-average", putts: 33 },
  ] as const;

  it("heads scoring, ball striking and putting with their category's lead insight", () => {
    expect(tabNarrative([...insights], "scoring")?.text).toMatch(/^You score best on par 4s/);
    expect(tabNarrative([...insights], "ball-striking")?.text).toMatch(/^Your average GIR% is 40.0%/);
    expect(tabNarrative([...insights], "putting")?.text).toMatch(/^Averaging 33.0 putts/);
  });

  it("leaves profile and range view without one", () => {
    expect(tabNarrative([...insights], "profile")).toBeNull();
    expect(tabNarrative([...insights], "range")).toBeNull();
  });
});

describe("narrativeTone", () => {
  it("is good when the arrow moves the way that helps, bad when it doesn't, neutral when flat", () => {
    expect(narrativeTone({ text: "", trend: "down", positiveUp: false })).toBe("good");
    expect(narrativeTone({ text: "", trend: "up", positiveUp: true })).toBe("good");
    expect(narrativeTone({ text: "", trend: "up", positiveUp: false })).toBe("bad");
    expect(narrativeTone({ text: "", trend: "down", positiveUp: true })).toBe("bad");
    expect(narrativeTone({ text: "", trend: "flat", positiveUp: true })).toBe("neutral");
  });
});

describe("labels", () => {
  it("says why the page is empty", () => {
    expect(emptyMessage(true)).toBe("No rounds found for the selected filters.");
    expect(emptyMessage(false)).toBe("Play some rounds to see your analytics.");
  });
});
