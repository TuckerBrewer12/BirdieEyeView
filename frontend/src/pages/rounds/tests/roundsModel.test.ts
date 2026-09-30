import { describe, it, expect } from "vitest";
import {
  courseChips,
  effectiveSort,
  filterRounds,
  modeAfterPickingSort,
  sortAfterPicking,
  type ListedRound,
  type Sort,
} from "../roundsModel";

function round(course: string | null, score: number | null, date = "2026-01-01"): ListedRound {
  return {
    course: course == null ? null : { name: course },
    score,
    toPar: score == null ? null : score - 72,
    date,
  };
}

const byDate: Sort = { key: "date", ascending: false };
const byScoreHighFirst: Sort = { key: "total_score", ascending: false };
const byScoreLowFirst: Sort = { key: "total_score", ascending: true };

describe("filterRounds", () => {
  it("matches the search anywhere in the course name, ignoring case", () => {
    const rounds = [round("Blue Rock", 80), round("Half Moon Bay", 85), round("Rock Creek", 90)];
    expect(filterRounds(rounds, "all", "ROCK", byDate).map((r) => r.course?.name)).toEqual([
      "Blue Rock",
      "Rock Creek",
    ]);
  });

  it("applies the search inside a course chip", () => {
    const rounds = [round("Blue Rock", 80), round("Half Moon Bay", 85)];
    expect(filterRounds(rounds, "Half Moon Bay", "rock", byDate)).toEqual([]);
  });

  it("puts rounds with no score last in both directions", () => {
    const rounds = [round("A", null), round("B", 90), round("C", 80)];
    expect(filterRounds(rounds, "all", "", byScoreHighFirst).map((r) => r.score)).toEqual([90, 80, null]);
    expect(filterRounds(rounds, "all", "", byScoreLowFirst).map((r) => r.score)).toEqual([80, 90, null]);
  });

  it("Best lists the lowest score first whatever sort was chosen", () => {
    const rounds = [round("A", 85), round("B", 72), round("C", 90)];
    expect(filterRounds(rounds, "best", "", { key: "course_name", ascending: false }).map((r) => r.score))
      .toEqual([72, 85, 90]);
  });

  it("L20 keeps the twenty most recent rounds, however they arrive", () => {
    const rounds = Array.from({ length: 25 }, (_, i) =>
      round(`Course ${i}`, 80, `2026-01-${String(25 - i).padStart(2, "0")}`),
    ).reverse();
    const kept = filterRounds(rounds, "l20", "", byDate);
    expect(kept).toHaveLength(20);
    expect(kept.map((r) => r.date).at(-1)).toBe("2026-01-06");
  });

  it("does not reorder the list it was given", () => {
    const rounds = [round("A", 90), round("B", 80)];
    filterRounds(rounds, "all", "", byScoreLowFirst);
    expect(rounds.map((r) => r.score)).toEqual([90, 80]);
  });
});

describe("sortAfterPicking", () => {
  it("flips direction when the same key is picked again", () => {
    expect(sortAfterPicking(byScoreHighFirst, "total_score")).toEqual(byScoreLowFirst);
  });

  it("starts a new key high-to-low", () => {
    expect(sortAfterPicking(byDate, "to_par")).toEqual({ key: "to_par", ascending: false });
  });

  it("starts course names A–Z", () => {
    expect(sortAfterPicking(byDate, "course_name")).toEqual({ key: "course_name", ascending: true });
  });
});

describe("modeAfterPickingSort", () => {
  it("leaves Best, which would ignore the pick", () => {
    expect(modeAfterPickingSort("best")).toBe("all");
  });

  it("keeps every other chip", () => {
    expect(modeAfterPickingSort("l20")).toBe("l20");
    expect(modeAfterPickingSort("Blue Rock")).toBe("Blue Rock");
  });
});

describe("effectiveSort", () => {
  it("passes the chosen sort through outside Best", () => {
    expect(effectiveSort("all", byDate)).toEqual({ ...byDate, locked: false });
  });

  it("locks Best to score, lowest first", () => {
    expect(effectiveSort("best", byDate)).toEqual({ key: "total_score", ascending: true, locked: true });
  });
});

describe("courseChips", () => {
  it("offers All, L20 and Best, then the six most-played courses", () => {
    const rounds = [
      ...["G", "F", "E", "D", "C", "B", "A"].flatMap((name, i) =>
        Array.from({ length: i + 1 }, () => round(name, 80)),
      ),
      round(null, 80),
    ];
    expect(courseChips(rounds).map((c) => c.mode)).toEqual(["all", "l20", "best", "A", "B", "C", "D", "E", "F"]);
  });
});
