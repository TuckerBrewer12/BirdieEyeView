import { render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ScoreMixBar } from "./ScoreMixBar";

const mix = { eagle: 0, birdie: 25, par: 50, bogey: 25, double: 0, triple: 0, quad: 0 };

describe("ScoreMixBar", () => {
  it("counts the holes of each kind when it knows how many there are", () => {
    render(<ScoreMixBar mix={mix} holes={4} />);
    expect(screen.getByRole("img", { name: "Score mix: 1 birdie, 2 pars, 1 bogey" })).toBeInTheDocument();
  });

  it("gives each share when it does not", () => {
    render(<ScoreMixBar mix={mix} />);
    expect(screen.getByRole("img", { name: "Score mix: 25% birdie, 50% par, 25% bogey" })).toBeInTheDocument();
  });
});
