import { fireEvent, render, screen } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ActivityHeatmap } from "./ActivityHeatmap";
import { Round } from "@/domain";
import { FakeHandler } from "@/testing/fakes/FakeHandler";
import { populatedRounds } from "@/testing/fixtures/rounds";

const TODAY = new Date(2026, 9, 28, 12);

const round = (id: string, date: string) => Round.fromSummary({ ...populatedRounds[0], id, date });
const rounds = [
  round("1", "2026-10-14T14:30:00"),
  round("2", "2026-10-14T08:00:00"),
  round("3", "2026-10-13"),
  round("4", "2026/09/20"),
];

describe("ActivityHeatmap", () => {
  it("shows the month of today, with its round count and a filled day per played day", () => {
    const { container } = render(<ActivityHeatmap rounds={rounds} today={TODAY} />);

    expect(screen.getByText("October 2026")).toBeTruthy();
    expect(screen.getByText("rounds")).toBeTruthy();

    const twoRounds = container.querySelector('[title="2 rounds on 2026-10-14"]');
    expect(twoRounds?.className).toContain("bg-primary");
    const oneRound = container.querySelector('[title="1 round on 2026-10-13"]');
    expect(oneRound?.className).toContain("bg-primary");
    expect(container.querySelector('[title="1 round on 2026-09-20"]')).toBeNull();
  });

  it("steps to the neighbouring months", () => {
    const { container } = render(<ActivityHeatmap rounds={rounds} today={TODAY} />);

    fireEvent.click(screen.getByRole("button", { name: "Previous month" }));
    expect(screen.getByText("September 2026")).toBeTruthy();
    expect(container.querySelector('[title="1 round on 2026-09-20"]')?.className).toContain("bg-primary");

    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    fireEvent.click(screen.getByRole("button", { name: "Next month" }));
    expect(screen.getByText("November 2026")).toBeTruthy();
  });

  it("opens the first round of a played day when given a handler", () => {
    const onOpenRound = new FakeHandler<[string]>();
    render(<ActivityHeatmap rounds={rounds} today={TODAY} onOpenRound={onOpenRound.handle} />);

    fireEvent.click(screen.getByRole("button", { name: "Open round on 2026-10-14" }));
    expect(onOpenRound.calls).toEqual([["1"]]);
    expect(screen.getByText("Played · tap a day to open the round")).toBeTruthy();
  });
});
