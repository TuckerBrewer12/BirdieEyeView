import { describe, it, expect } from "vitest";
import { roundDayAndTee, roundLine } from "../round";

describe("roundLine", () => {
  it("names a round by its course, day and score, the course formatted", () => {
    expect(roundLine({ course: { id: null, name: "half moon bay" }, date: "2026-06-15", score: 78 })).toBe(
      "Half Moon Bay · Jun 15 · 78",
    );
  });

  it("leaves out what the round doesn't have", () => {
    expect(roundLine({ course: null, date: null, score: 85 })).toBe("85");
  });
});

describe("roundDayAndTee", () => {
  it("puts the day before the tee, the tee in title case", () => {
    expect(roundDayAndTee({ date: "2026-10-15", teeBox: "blue" })).toBe("Oct 15 · Blue tees");
  });

  it("keeps whichever part the round has, and is null with neither", () => {
    expect(roundDayAndTee({ date: "2026-10-15", teeBox: null })).toBe("Oct 15");
    expect(roundDayAndTee({ date: null, teeBox: "White" })).toBe("White tees");
    expect(roundDayAndTee({ date: null, teeBox: null })).toBeNull();
  });
});
