import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RunningToParLine } from "./RunningToParLine";

const holes = [1, 1, 1, 2, 3, 3, 4, 4, 4, 4, 5, 5, 6, 6, 6, 7, 7, 6].map((runningToPar, i) => ({
  hole: i + 1,
  strokes: null,
  kind: null,
  runningToPar,
}));

describe("RunningToParLine", () => {
  it("names the finish and marks level, the turn and the last hole", () => {
    render(<RunningToParLine holes={holes} />);
    expect(screen.getByRole("img", { name: "Running score to par, finishing +6" })).toBeTruthy();
    for (const mark of ["E", "+6", "Turn", "18"]) expect(screen.getByText(mark)).toBeTruthy();
  });

  it("leaves out a hole the server couldn't run", () => {
    const gap = holes.map((hole) => (hole.hole === 18 ? { ...hole, runningToPar: null } : hole));
    render(<RunningToParLine holes={gap} />);
    expect(screen.getByRole("img", { name: "Running score to par, finishing +7" })).toBeTruthy();
  });

  it("draws the phone's line with no figures, and nothing for a single hole", () => {
    const { container, rerender } = render(<RunningToParLine holes={holes} compact />);
    expect(container.querySelector("text")).toBeNull();
    rerender(<RunningToParLine holes={holes.slice(0, 1)} />);
    expect(container.querySelector("svg")).toBeNull();
  });
});
