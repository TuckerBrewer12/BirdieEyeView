import { describe, it, expect } from "vitest";
import { roundLine } from "../round";

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
