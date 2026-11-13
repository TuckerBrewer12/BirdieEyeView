import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { TrendAreaChart } from "./TrendAreaChart";

const points = Array.from({ length: 12 }, (_, i) => ({ tick: i + 1, title: `Round ${i + 1}`, values: [80 + (i % 4)] }));

describe("TrendAreaChart", () => {
  it("shows every round, then fewer as the slider moves", () => {
    function Windowed() {
      const [shown, setShown] = useState<number | null>(null);
      return <TrendAreaChart shown={shown} onShownChange={setShown} points={points} series={[{ label: "Score" }]} />;
    }
    render(<Windowed />);
    expect(screen.getByText("All 12 rounds")).toBeInTheDocument();

    fireEvent.keyDown(screen.getByRole("slider", { name: "Rounds shown" }), { key: "ArrowLeft" });
    expect(screen.getByText("Last 11 of 12")).toBeInTheDocument();
  });

  it("draws holes of a kind in their own panel, and the counts alone with the series off", () => {
    const counts = [{ kind: "birdie" as const, label: "Birdies", values: points.map((_, i) => i % 3) }];
    const { container, rerender } = render(<TrendAreaChart points={points} series={[{ label: "Score" }]} counts={counts} />);
    expect(container.querySelectorAll("[data-slot=trend-area-count]")).toHaveLength(1);

    rerender(<TrendAreaChart points={points} series={[{ label: "Score" }]} counts={[]} showSeries={false} offLabel="Nothing on" />);
    expect(screen.getByText("Nothing on")).toBeInTheDocument();
  });
});
