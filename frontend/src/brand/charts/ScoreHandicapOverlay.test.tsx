import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { trendPointsFrom } from "@/domain";
import { populatedDashboard } from "@/testing/fixtures/dashboard";
import { ScoreHandicapOverlay } from "./ScoreHandicapOverlay";

const points = trendPointsFrom(populatedDashboard);

describe("ScoreHandicapOverlay", () => {
  it("labels each score, the score grid, par and the latest index", () => {
    render(<ScoreHandicapOverlay data={points} />);
    expect(screen.getByRole("img", { name: "Scores over the last 5 rounds: 85, 69, 72, 78, 80" })).toBeTruthy();
    for (const figure of ["85", "69", "72", "78", "80", "Par", "90"]) {
      expect(screen.getAllByText(figure).length).toBeGreaterThan(0);
    }
    expect(screen.getByText("12.4")).toBeTruthy();
  });

  it("asks for a second round before it draws", () => {
    render(<ScoreHandicapOverlay data={points.slice(0, 1)} />);
    expect(screen.getByText("Play two rounds to see the trend")).toBeTruthy();
  });
});
