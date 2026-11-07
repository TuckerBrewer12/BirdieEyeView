import { describe, expect, it } from "vitest";
import {
  benchmarkComparisonFrom,
  benchmarkShapeFrom,
  buildRadarData,
  goalAttemptsFrom,
  goalScoreToBreak,
  goalTargetLabel,
} from "@/domain";
import { labBenchmarks, labGoalReport } from "@/testing/fixtures/lab";

describe("goals", () => {
  it("reads a stored goal as the score to break", () => {
    expect(goalScoreToBreak(79)).toBe(80);
    expect(goalTargetLabel(71)).toBe("Break 72");
  });

  it("keeps each attempt as the server marked it", () => {
    const attempts = goalAttemptsFrom(labGoalReport.attempts);
    expect(attempts).toHaveLength(12);
    expect(attempts[5]).toEqual({ roundId: "lab-6", score: 89, metGoal: true });
    expect(attempts.filter((attempt) => attempt.metGoal)).toHaveLength(1);
  });
});

describe("benchmark comparison", () => {
  it("maps the server's shape and par-type verdicts", () => {
    const comparison = benchmarkComparisonFrom(labBenchmarks["handicap:15"]);
    expect(comparison.benchmark).toMatchObject({ girPct: 24, puttsPerGir: 2.1, par4ToPar: 1.025 });
    expect(comparison.parTypes.map((row) => [row.par, row.gap, row.verdict])).toEqual([
      [3, 0.32, "behind"],
      [4, 0.1, "behind"],
      [5, -0.25, "ahead"],
    ]);
  });

  it("has no shape when the server has none to draw", () => {
    expect(benchmarkComparisonFrom(labBenchmarks["friend:user-jordan"]).benchmark).toBeNull();
  });

  it("lists the goals and handicaps the server has benchmarks for", () => {
    const { goals, handicaps } = benchmarkComparisonFrom(labBenchmarks.alone);
    expect(goals.map(goalTargetLabel)).toEqual([
      "Break 100",
      "Break 95",
      "Break 90",
      "Break 85",
      "Break 80",
      "Break 75",
      "Break 72",
    ]);
    expect(handicaps[1]).toEqual({ handicap: 5, goal: 79 });
  });
});

describe("radar scale", () => {
  it("draws a friend's shape at their own figures", () => {
    const shape = benchmarkShapeFrom(labBenchmarks["friend:user-avery"].benchmark!);
    const entries = buildRadarData(shape, shape);
    for (const entry of entries) expect(entry.benchmark).toBeCloseTo(entry.value, 5);
    // A par type's average reads as it does everywhere else, to two places.
    expect(entries.map((entry) => entry.benchRaw)).toEqual(["44%", "38%", "1.92/GIR", "+0.35", "+0.55", "+0.3"]);
  });

  it("puts a figure the comparison has none of at the centre", () => {
    const mine = benchmarkShapeFrom(labBenchmarks["friend:user-avery"].benchmark!);
    const shape = { ...benchmarkShapeFrom(labBenchmarks["handicap:15"].benchmark!), par5ToPar: null };
    const entries = buildRadarData(mine, shape);
    expect(entries[5].benchmark).toBe(0);
    expect(entries[5].benchRaw).toBe("—");
    expect(entries[3].benchRaw).toBe("+0.6");
  });

  it("has nothing to draw for a golfer with no shape", () => {
    expect(buildRadarData(null).every((entry) => !entry.hasData && entry.userRaw === "—")).toBe(true);
  });
});
