import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ActivityHeatmap } from "./ActivityHeatmap";
import type { Round } from "@/domain";

describe("ActivityHeatmap", () => {
  it("should format dates correctly and render active squares for rounds", () => {
    const today = new Date();

    const formatDateStr = (date: Date) => {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const d = String(date.getDate()).padStart(2, "0");
      return `${y}-${m}-${d}`;
    };

    const dateA = new Date(today);
    dateA.setDate(dateA.getDate() - 1);

    const dateB = new Date(today);
    dateB.setDate(dateB.getDate() - 2);

    const dateC = new Date(today);
    dateC.setDate(dateC.getDate() - 100);

    const round = (id: string, date: string): Round => ({
      id, date, course: null, teeBox: null, holes: [], totalPutts: null, totalGir: null,
    });
    const rounds = [
      round("1", formatDateStr(dateA) + "T14:30:00Z"),
      round("2", formatDateStr(dateA) + "T08:00:00"),
      round("3", formatDateStr(dateB)),
      round("4", formatDateStr(dateC).replace(/-/g, "/")),
    ];

    const { container } = render(<ActivityHeatmap rounds={rounds} today={today} />);

    const twoRoundsSquare = container.querySelector(`[title="2 rounds on ${formatDateStr(dateA)}"]`);
    expect(twoRoundsSquare).not.toBeNull();
    expect(twoRoundsSquare?.className).toContain("bg-score-birdie");

    const oneRoundSquare = container.querySelector(`[title="1 round on ${formatDateStr(dateB)}"]`);
    expect(oneRoundSquare).not.toBeNull();
    expect(oneRoundSquare?.className).toContain("bg-score-birdie");

    const fallbackSquare = container.querySelector(`[title="1 round on ${formatDateStr(dateC)}"]`);
    expect(fallbackSquare).toBeNull();
  });
});
