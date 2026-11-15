import { describe, it, expect } from "vitest";
import {
  ALL_COURSES,
  courseOptions,
  effectiveSort,
  filterRounds,
  scopeAfterPickingSort,
  type ListedRound,
  type RoundsQuery,
} from "../roundsModel";

function round(
  course: string | null,
  toPar: number | null,
  date = "2026-01-01",
  bestRank: number | null = null,
  worstRank: number | null = null,
): ListedRound {
  return { course: course == null ? null : { name: course }, toPar, date, bestRank, worstRank };
}

const query = (over: Partial<RoundsQuery> = {}): RoundsQuery => ({
  scope: "all",
  course: ALL_COURSES,
  search: "",
  sort: "newest",
  ...over,
});

describe("filterRounds", () => {
  it("matches the search anywhere in the course name, ignoring case", () => {
    const rounds = [round("Blue Rock", 8), round("Half Moon Bay", 13), round("Rock Creek", 18)];
    expect(filterRounds(rounds, query({ search: "ROCK", sort: "course" })).map((r) => r.course?.name)).toEqual([
      "Blue Rock",
      "Rock Creek",
    ]);
  });

  it("applies the search inside the course picked", () => {
    const rounds = [round("Blue Rock", 8), round("Half Moon Bay", 13)];
    expect(filterRounds(rounds, query({ course: "Half Moon Bay", search: "rock" }))).toEqual([]);
  });

  it("orders newest and oldest by date", () => {
    const rounds = [round("A", 0, "2026-02-01"), round("B", 0, "2026-03-01"), round("C", 0, "2026-01-01")];
    expect(filterRounds(rounds, query({ sort: "newest" })).map((r) => r.course?.name)).toEqual(["B", "A", "C"]);
    expect(filterRounds(rounds, query({ sort: "oldest" })).map((r) => r.course?.name)).toEqual(["C", "A", "B"]);
  });

  it("Worst score follows the server's order, a full round ahead of a nine, unplaced rounds last", () => {
    const rounds = [round("A", null), round("Nine", 20, undefined, 3, 3), round("B", 18, undefined, 2, 1), round("C", 8, undefined, 1, 2)];
    expect(filterRounds(rounds, query({ sort: "worst" })).map((r) => r.course?.name)).toEqual(["B", "C", "Nine", "A"]);
  });

  it("Best score follows the server's order, unplaced rounds last", () => {
    const rounds = [round("A", 13, undefined, 2), round("Nine", 2, undefined, 3), round("B", 2, undefined, 1), round("C", null)];
    expect(filterRounds(rounds, query({ sort: "best" })).map((r) => r.course?.name)).toEqual(["B", "A", "Nine", "C"]);
  });

  it("the Best scope orders by the server's rank whatever sort was chosen", () => {
    const rounds = [round("A", 13, "2026-03-01", 2), round("B", 2, "2026-01-01", 1)];
    expect(filterRounds(rounds, query({ scope: "best", sort: "newest" })).map((r) => r.course?.name)).toEqual(["B", "A"]);
  });

  it("Last 20 keeps the twenty most recent rounds at the course picked, however they arrive", () => {
    const rounds = [
      ...Array.from({ length: 25 }, (_, i) => round("Home", 8, `2026-01-${String(i + 1).padStart(2, "0")}`)),
      round("Away", 8, "2026-02-01"),
    ];
    const kept = filterRounds(rounds, query({ scope: "last20", course: "Home" }));
    expect(kept).toHaveLength(20);
    expect(kept.at(-1)?.date).toBe("2026-01-06");
  });

  it("does not reorder the list it was given", () => {
    const rounds = [round("A", 18, undefined, 2, 1), round("B", 8, undefined, 1, 2)];
    filterRounds(rounds, query({ sort: "worst" }));
    expect(rounds.map((r) => r.toPar)).toEqual([18, 8]);
  });
});

describe("scopeAfterPickingSort", () => {
  it("leaves Best, which would ignore the pick", () => {
    expect(scopeAfterPickingSort("best")).toBe("all");
  });

  it("keeps the other scopes", () => {
    expect(scopeAfterPickingSort("last20")).toBe("last20");
  });
});

describe("effectiveSort", () => {
  it("passes the chosen sort through outside Best", () => {
    expect(effectiveSort("all", "oldest")).toBe("oldest");
  });

  it("is Best score in the Best scope", () => {
    expect(effectiveSort("best", "oldest")).toBe("best");
  });
});

describe("courseOptions", () => {
  it("offers All courses, then every course, the most played first", () => {
    const rounds = [
      ...["c", "b", "a"].flatMap((name, i) => Array.from({ length: i + 1 }, () => round(name, 8))),
      round(null, 8),
    ];
    expect(courseOptions(rounds)).toEqual([
      { value: ALL_COURSES, label: "All courses" },
      { value: "a", label: "A" },
      { value: "b", label: "B" },
      { value: "c", label: "C" },
    ]);
  });
});
