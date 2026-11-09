import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { RunningToParLine } from "./RunningToParLine";

const flow = [1, 1, 1, 2, 3, 3, 4, 4, 4, 4, 5, 5, 6, 6, 6, 7, 7, 6].map((toPar, i) => ({ hole: i + 1, toPar }));

describe("RunningToParLine", () => {
  it("names the finish and marks level, the turn and the last hole", () => {
    render(<RunningToParLine flow={flow} />);
    expect(screen.getByRole("img", { name: "Running score to par, finishing +6" })).toBeTruthy();
    for (const mark of ["E", "+6", "Turn", "18"]) expect(screen.getByText(mark)).toBeTruthy();
  });

  it("draws the phone's line with no figures, and nothing for a single hole", () => {
    const { container, rerender } = render(<RunningToParLine flow={flow} compact />);
    expect(container.querySelector("text")).toBeNull();
    rerender(<RunningToParLine flow={flow.slice(0, 1)} />);
    expect(container.querySelector("svg")).toBeNull();
  });
});
