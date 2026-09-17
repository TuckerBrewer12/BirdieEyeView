import { render } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { ActivityHeatmap } from "./ActivityHeatmap";
import type { RoundSummary } from "@/types/golf";

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

    const rounds: RoundSummary[] = [
      {
        id: "1",
        date: formatDateStr(dateA) + "T14:30:00Z",
        course_id: null, course_name: null, course_location: null,
        course_par: null, tee_box: null, total_score: 80, to_par: null,
        front_nine: null, back_nine: null, total_putts: null, total_gir: null,
        fairways_hit: null, notes: null,
      },
      {
        id: "2",
        date: formatDateStr(dateA) + "T08:00:00",
        course_id: null, course_name: null, course_location: null, course_par: null,
        tee_box: null, total_score: 82, to_par: null, front_nine: null, back_nine: null,
        total_putts: null, total_gir: null, fairways_hit: null, notes: null,
      },
      {
        id: "3",
        date: formatDateStr(dateB),
        course_id: null, course_name: null, course_location: null, course_par: null,
        tee_box: null, total_score: 75, to_par: null, front_nine: null, back_nine: null,
        total_putts: null, total_gir: null, fairways_hit: null, notes: null,
      },
      {
        id: "4",
        date: formatDateStr(dateC).replace(/-/g, "/"),
        course_id: null, course_name: null, course_location: null, course_par: null,
        tee_box: null, total_score: 75, to_par: null, front_nine: null, back_nine: null,
        total_putts: null, total_gir: null, fairways_hit: null, notes: null,
      },
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
