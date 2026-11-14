import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ScoreMixDonut } from "./ScoreMixDonut";

describe("ScoreMixDonut", () => {
  it("draws a slice for each kind the holes have, and reads them out", () => {
    const { container } = render(
      <ScoreMixDonut mix={{ eagle: 0, birdie: 25, par: 50, bogey: 25, double: 0, triple: 0, quad: 0 }} />,
    );
    expect(screen.getByRole("img", { name: "Score mix: 25% birdie, 50% par, 25% bogey" })).toBeInTheDocument();
    expect(container.querySelectorAll("path")).toHaveLength(3);
  });

  it("draws nothing without holes", () => {
    const { container } = render(
      <ScoreMixDonut mix={{ eagle: 0, birdie: 0, par: 0, bogey: 0, double: 0, triple: 0, quad: 0 }} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
