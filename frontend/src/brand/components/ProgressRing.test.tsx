import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ProgressRing } from "./ProgressRing";

describe("ProgressRing", () => {
  it("reads its progress out, held between none and all the way", () => {
    const { rerender } = render(<ProgressRing value={82} label="Progress to break 80" />);
    expect(screen.getByRole("img", { name: "Progress to break 80: 82%" })).toBeTruthy();
    rerender(<ProgressRing value={140} label="Progress to break 80" />);
    expect(screen.getByRole("img", { name: "Progress to break 80: 100%" })).toBeTruthy();
    rerender(<ProgressRing value={null} label="Progress to break 80" />);
    expect(screen.getByRole("img", { name: "Progress to break 80: 0%" })).toBeTruthy();
  });
});
