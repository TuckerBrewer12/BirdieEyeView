import { describe, expect, it } from "vitest";
import { emptyAnalytics } from "@/testing/fixtures/dashboard";
import { lifetimeMilestones } from "../milestones";

describe("lifetimeMilestones", () => {
  it("is empty with no achievements", () => {
    expect(lifetimeMilestones(null)).toEqual([]);
    expect(lifetimeMilestones(emptyAnalytics().notable_achievements)).toEqual([]);
  });

  it("reports the first under-par round as a fact, not a label", () => {
    const achievements = structuredClone(emptyAnalytics().notable_achievements);
    achievements.round_milestones.lifetime.first_round_under_par = {
      score: 71,
      date: "2026-05-02T00:00:00",
      course: "Blue Rock",
    };
    expect(lifetimeMilestones(achievements)).toEqual([
      { kind: "under_par", value: 71, date: "2026-05-02", course: "Blue Rock", roundId: null },
    ]);
  });
});
