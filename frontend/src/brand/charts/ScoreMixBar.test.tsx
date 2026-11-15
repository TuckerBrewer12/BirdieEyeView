import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ScoreMixBar, ScoreMixLegend } from "./ScoreMixBar";

describe("ScoreMixBar", () => {
  it("counts the holes of each kind when the mix is counted", () => {
    render(<ScoreMixBar mix={{ eagle: 0, birdie: 1, par: 2, bogey: 1, double: 0, triple: 0, quad: 0 }} counted />);
    expect(screen.getByRole("img", { name: "Score mix: 1 birdie, 2 pars, 1 bogey" })).toBeInTheDocument();
  });

  it("gives each share when it is not", () => {
    render(<ScoreMixBar mix={{ eagle: 0, birdie: 25, par: 50, bogey: 25, double: 0, triple: 0, quad: 0 }} />);
    expect(screen.getByRole("img", { name: "Score mix: 25% birdie, 50% par, 25% bogey" })).toBeInTheDocument();
  });

  it("folds triples and worse into one share when asked, keeping slivers that add up", () => {
    render(<ScoreMixBar fold mix={{ eagle: 0, birdie: 5, par: 42, bogey: 40, double: 12, triple: 0.6, quad: 0.4 }} />);
    expect(
      screen.getByRole("img", { name: "Score mix: 5% birdie, 42% par, 40% bogey, 12% double, 1% triple+" }),
    ).toBeInTheDocument();
  });

  it("keys a stack of bars by the kinds any of them show", () => {
    const { container } = render(
      <ScoreMixLegend
        fold
        mixes={[
          { eagle: 0, birdie: 10, par: 60, bogey: 30, double: 0, triple: 0, quad: 0 },
          { eagle: 0, birdie: 0, par: 30, bogey: 50, double: 15, triple: 0, quad: 5 },
        ]}
      />,
    );
    expect(container).toHaveTextContent("BirdieParBogeyDoubleTriple+");
  });
});
