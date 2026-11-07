import { describe, expect, it } from "vitest";
import { labGoalReport } from "@/testing/fixtures/lab";
import { goalStandingFrom } from "../goal";

describe("goalStandingFrom", () => {
  it("is null with no goal", () => {
    expect(goalStandingFrom(null, labGoalReport)).toBeNull();
  });

  it("stands the goal with no figures before the report loads", () => {
    expect(goalStandingFrom(79, null)).toEqual({
      target: 79,
      average: null,
      gap: null,
      progressPct: null,
      onTrack: false,
      lowestScore: null,
      roundsMeetingGoal: null,
      attempts: [],
      savers: [],
    });
  });

  it("keeps the server's savers as they came", () => {
    const savers = goalStandingFrom(89, labGoalReport)!.savers;
    expect(savers[1]).toEqual({
      kind: "blowup_holes",
      strokesSaved: 0.9,
      shareOfGap: 33,
      headline: labGoalReport.savers[1].headline,
      detail: labGoalReport.savers[1].detail,
    });
  });
});
