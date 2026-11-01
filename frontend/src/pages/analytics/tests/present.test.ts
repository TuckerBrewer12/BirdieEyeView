import { describe, expect, it } from "vitest";
import { averagePuttsLabel, emptyMessage, girVsNonGirBars, leadNarrative, narrativeFor } from "../present";

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
      "You score best on par 5s — averaging +0.40 across 12 holes.",
    );
    expect(narrativeFor({ kind: "best-par", par: 3, averageToPar: -0.1, holes: 8 })).toMatchObject({
      text: "You score best on par 3s — averaging -0.10 across 8 holes.",
      trend: "down",
    });
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

describe("labels", () => {
  it("says why the page is empty", () => {
    expect(emptyMessage(true)).toBe("No rounds found for the selected filters.");
    expect(emptyMessage(false)).toBe("Play some rounds to see your analytics.");
  });

  it("shows average putts to one decimal", () => {
    expect(averagePuttsLabel(33)).toBe("33.0");
    expect(averagePuttsLabel(null)).toBeNull();
  });
});

describe("girVsNonGirBars", () => {
  it("puts under-par shares left of zero and keeps each score kind", () => {
    expect(
      girVsNonGirBars([
        {
          bucket: "GIR",
          holes_counted: 10,
          eagle: 2,
          birdie: 20,
          par: 60,
          bogey: 15,
          double_bogey: 2,
          triple_bogey: 1,
          quad_bogey: 0.5,
        },
      ]),
    ).toEqual([
      { bucket: "GIR", eagle: -2, birdie: -20, par: 60, bogey: 15, double: 2, triple: 1, quad: 0.5 },
    ]);
  });
});
