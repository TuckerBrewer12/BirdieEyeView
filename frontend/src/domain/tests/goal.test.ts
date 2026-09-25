import { describe, expect, it } from "vitest";
import { dashboardGoalReport, populatedAnalytics } from "@/testing/fixtures/dashboard";
import { goalProgressPct } from "../goal";

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
