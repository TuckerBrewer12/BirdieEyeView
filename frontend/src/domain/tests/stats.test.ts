import { describe, expect, it } from "vitest";
import { emptyAnalytics, populatedAnalytics } from "@/testing/fixtures/dashboard";
import { mixHoleCount, puttsBand, recentStats, scoreMix, scoringAvg } from "../stats";

describe("scoringAvg", () => {
  it("averages every scored round, or only the last `window`", () => {
    expect(scoringAvg(populatedAnalytics)).toBeCloseTo(76.8, 5);
    expect(scoringAvg(populatedAnalytics, 2)).toBe(79);
  });

  it("is null with no scored rounds", () => {
    expect(scoringAvg(null)).toBeNull();
    expect(scoringAvg(emptyAnalytics())).toBeNull();
  });
});

describe("recentStats", () => {
  it("pools GIR, scrambling, and up-and-down by opportunity over the window", () => {
    const stats = recentStats(populatedAnalytics);
    expect(stats.girPct).toBeCloseTo((35 / 90) * 100, 5);
    expect(stats.scramblingPct).toBe(37.5);
    expect(stats.upAndDownPct).toBeCloseTo(100 / 3, 5);
    expect(stats.putts).toBe(32);
  });

  it("falls back to the KPI GIR and the given putts average with no trend rows", () => {
    const stats = recentStats(
      emptyAnalytics({ kpis: { ...emptyAnalytics().kpis, gir_percentage: 42 } }),
      { puttsFallback: 31 },
    );
    expect(stats.girPct).toBe(42);
    expect(stats.putts).toBe(31);
    expect(stats.scramblingPct).toBeNull();
    expect(stats.upAndDownPct).toBeNull();
  });

  it("leaves GIR and putts null when nothing measures them", () => {
    const stats = recentStats(emptyAnalytics());
    expect(stats.girPct).toBeNull();
    expect(stats.putts).toBeNull();
  });
});

describe("scoreMix", () => {
  const rows = populatedAnalytics.score_type_distribution;

  it("maps analytics fields onto score kinds, weighted by holes", () => {
    const mix = Object.fromEntries(scoreMix(rows).map((d) => [d.name, d.value]));
    expect(mix).toEqual({ eagle: 0, birdie: 10, par: 40, bogey: 35, double: 10, triple: 5, quad: 0 });
  });

  it("can drop empty kinds", () => {
    expect(scoreMix(rows, { dropZero: true }).map((d) => d.name)).toEqual([
      "birdie", "par", "bogey", "double", "triple",
    ]);
  });

  it("counts holes across rows", () => {
    expect(mixHoleCount(rows)).toBe(90);
    expect(scoreMix([])).toEqual([]);
  });
});

describe("puttsBand", () => {
  it("splits at 30 and 35 putts", () => {
    expect(puttsBand(29.9)).toBe("good");
    expect(puttsBand(30)).toBe("fair");
    expect(puttsBand(35)).toBe("fair");
    expect(puttsBand(35.1)).toBe("poor");
    expect(puttsBand(null)).toBeNull();
  });
});
