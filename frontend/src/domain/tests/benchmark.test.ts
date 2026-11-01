import { describe, expect, it } from "vitest";
import {
  GOAL_BENCHMARK,
  benchmarkProfileFrom,
  buildRadarData,
  goalScoreToBreak,
  goalTargetLabel,
  nearestGoalBenchmark,
  profileAverageToPar,
  profilePuttsPerGir,
} from "@/domain";
import { averyLabAnalytics } from "@/testing/fixtures/lab";

describe("goals", () => {
  it("reads a stored goal as the score to break", () => {
    expect(goalScoreToBreak(79)).toBe(80);
    expect(goalTargetLabel(71)).toBe("Break 72");
  });

  it("finds the goal benchmark nearest an average, the lower on a tie", () => {
    expect(nearestGoalBenchmark(88.4)).toBe(GOAL_BENCHMARK[89]);
    expect(nearestGoalBenchmark(76.5)).toBe(GOAL_BENCHMARK[74]);
    expect(nearestGoalBenchmark(120)).toBe(GOAL_BENCHMARK[99]);
    expect(nearestGoalBenchmark(60)).toBe(GOAL_BENCHMARK[71]);
  });
});

describe("radar scale", () => {
  it("puts a golfer's own figures on the benchmark scale", () => {
    const profile = benchmarkProfileFrom(averyLabAnalytics.kpis, averyLabAnalytics.scoring_by_par)!;
    expect(profile.gir).toBe(44);
    expect(profilePuttsPerGir(profile.putting)).toBeCloseTo(1.92, 5);
    expect(profileAverageToPar(profile.par3)).toBeCloseTo(0.35, 5);
  });

  it("has no profile for a golfer with no rounds", () => {
    const kpis = { ...averyLabAnalytics.kpis, total_rounds: 0 };
    expect(benchmarkProfileFrom(kpis, [])).toBeNull();
  });

  it("draws a friend's profile at their own figures", () => {
    const profile = benchmarkProfileFrom(averyLabAnalytics.kpis, averyLabAnalytics.scoring_by_par)!;
    const entries = buildRadarData(averyLabAnalytics.kpis, averyLabAnalytics.scoring_by_par, profile);
    for (const entry of entries) expect(entry.benchmark).toBeCloseTo(entry.value, 5);
  });
});
