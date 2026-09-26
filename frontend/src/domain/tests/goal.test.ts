import { describe, expect, it } from "vitest";
import { dashboardGoalReport, populatedAnalytics } from "@/testing/fixtures/dashboard";
import { goalProgress, goalProgressPct } from "../goal";

describe("goalProgressPct", () => {
  it("measures the way from the oldest round (85) toward the goal", () => {
    // (85 − 76.8) / (85 − 70)
    expect(goalProgressPct(70, null, populatedAnalytics)).toBeCloseTo(54.67, 1);
  });

  it("reads 100 when on track or already past the goal", () => {
    expect(goalProgressPct(70, { ...dashboardGoalReport, on_track: true }, populatedAnalytics)).toBe(100);
    expect(goalProgressPct(90, null, populatedAnalytics)).toBe(100);
  });

  it("is null without a goal or a score", () => {
    expect(goalProgressPct(null, dashboardGoalReport, populatedAnalytics)).toBeNull();
    expect(goalProgressPct(79, null, null)).toBeNull();
  });
});

describe("goalProgress", () => {
  it("is null until a goal is set", () => {
    expect(goalProgress(null, dashboardGoalReport, populatedAnalytics)).toBeNull();
  });

  it("carries the report's average, standing, and top saver", () => {
    expect(goalProgress(70, dashboardGoalReport, populatedAnalytics)).toMatchObject({
      target: 70,
      average: 76.8,
      onTrack: false,
      focus: "Fewer three-putts",
    });
  });

  it("still measures progress before the report loads", () => {
    const goal = goalProgress(70, null, populatedAnalytics);
    expect(goal?.average).toBeNull();
    expect(goal?.progressPct).toBeCloseTo(54.67, 1);
  });
});
