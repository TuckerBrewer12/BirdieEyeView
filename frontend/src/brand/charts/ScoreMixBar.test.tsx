import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ScoreMixBar } from "./ScoreMixBar";

describe("ScoreMixBar", () => {
  it("counts the holes of each kind when the mix is counted", () => {
    render(<ScoreMixBar mix={{ eagle: 0, birdie: 1, par: 2, bogey: 1, double: 0, triple: 0, quad: 0 }} counted />);
    expect(screen.getByRole("img", { name: "Score mix: 1 birdie, 2 pars, 1 bogey" })).toBeInTheDocument();
  });

  it("gives each share when it is not", () => {
    render(<ScoreMixBar mix={{ eagle: 0, birdie: 25, par: 50, bogey: 25, double: 0, triple: 0, quad: 0 }} />);
    expect(screen.getByRole("img", { name: "Score mix: 25% birdie, 50% par, 25% bogey" })).toBeInTheDocument();
  });
});
