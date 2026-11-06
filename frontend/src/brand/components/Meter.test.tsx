import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { Meter } from "./Meter";

describe("Meter", () => {
  it("reads as a meter at its value", () => {
    render(<Meter value={62} aria-label="Goal progress" />);
    expect(screen.getByRole("meter", { name: "Goal progress" })).toHaveAttribute("aria-valuenow", "62");
  });

  it("draws an unknown value as an empty track", () => {
    render(<Meter value={null} aria-label="Scrambling" />);
    expect(screen.getByRole("meter", { name: "Scrambling" })).toHaveAttribute("aria-valuenow", "0");
  });

  it("keeps the value and the marker on the track", () => {
    const { container } = render(<Meter value={140} marker={-10} aria-label="Clamped" />);
    expect(screen.getByRole("meter", { name: "Clamped" })).toHaveAttribute("aria-valuenow", "100");
    expect(container.querySelector<HTMLElement>("[data-slot=meter-marker]")?.style.left).toBe("0%");
  });
});
