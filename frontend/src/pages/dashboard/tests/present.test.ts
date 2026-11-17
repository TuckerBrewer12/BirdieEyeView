import { describe, expect, it } from "vitest";
import type { WhsRound } from "../model";
import { whsContextNote, whsExcludedNote, whsFormulaNote, whsRowNote, whsRowStatusLabel } from "../present";

const row = (overrides: Partial<WhsRound>): WhsRound => ({
  roundIndex: 1,
  courseName: "Hualalai Golf Course",
  courseRating: null,
  slopeRating: null,
  score: 82,
  differential: 10,
  used: false,
  excluded: false,
  ...overrides,
});

describe("whsContextNote", () => {
  it("says how many rounds count and what it uses until there are 20", () => {
    expect(whsContextNote(1, 5)).toBe(
      "With 5 rounds that count, the World Handicap System uses your best differential. At 20 rounds it uses the average of your best 8.",
    );
    expect(whsContextNote(2, 8)).toBe(
      "With 8 rounds that count, the World Handicap System uses the average of your best 2 differentials. At 20 rounds it uses the average of your best 8.",
    );
  });

  it("names the best 8 of the last 20 once the window is full", () => {
    expect(whsContextNote(8, 20)).toBe("The World Handicap System uses the average of your best 8 differentials from your last 20 rounds.");
  });

  it("says an index needs three rounds before there is one", () => {
    expect(whsContextNote(0, 2)).toBe("An index needs 3 rounds that count. You have 2.");
  });
});

describe("whsFormulaNote", () => {
  it("gives the rating and slope formula only when a round has them", () => {
    expect(whsFormulaNote(true)).toContain("× 113 ÷ slope rating");
    expect(whsFormulaNote(false)).toBeNull();
  });
});

describe("whsExcludedNote", () => {
  it("says how many rounds the starting handicap leaves out", () => {
    expect(whsExcludedNote(3, 12.5)).toBe(
      "3 rounds don’t count. Rounds from before you set your starting handicap of 12.5 only count when they beat it.",
    );
    expect(whsExcludedNote(1, 12.5)).toMatch(/^1 round doesn’t count\./);
    expect(whsExcludedNote(0, 12.5)).toBeNull();
  });
});

describe("a breakdown row", () => {
  it("marks a round the starting handicap leaves out", () => {
    expect(whsRowNote(row({ excluded: true }))).toBe("Before your starting handicap");
    expect(whsRowStatusLabel(row({ excluded: true }))).toBe("Doesn’t count: before your starting handicap");
  });

  it("reads as counting or not counted otherwise", () => {
    expect(whsRowNote(row({}))).toBeNull();
    expect(whsRowStatusLabel(row({ used: true }))).toBe("Counts toward index");
    expect(whsRowStatusLabel(row({}))).toBe("Not counted");
  });
});
