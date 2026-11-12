import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { LinePicker } from "./LinePicker";

const LINES = [
  { value: "score", label: "Score", swatch: "primary" },
  { value: "birdie", label: "Birdies", swatch: "birdie" },
  { value: "double", label: "Doubles", swatch: "double" },
] as const;

function Picker() {
  const [lines, setLines] = useState<string[]>(["score"]);
  return (
    <>
      <LinePicker label="Show" options={LINES} value={lines} onChange={setLines} />
      <output>{lines.join(",")}</output>
    </>
  );
}

describe("LinePicker", () => {
  it("turns any number of lines on and off, keeping the options' order", () => {
    render(<Picker />);
    fireEvent.click(screen.getByRole("button", { name: "Doubles" }));
    fireEvent.click(screen.getByRole("button", { name: "Birdies" }));
    expect(screen.getByRole("status")).toHaveTextContent("score,birdie,double");

    fireEvent.click(screen.getByRole("button", { name: "Score" }));
    expect(screen.getByRole("status")).toHaveTextContent(/^birdie,double$/);
    expect(screen.getByRole("button", { name: "Score" })).toHaveAttribute("aria-pressed", "false");
  });
});
