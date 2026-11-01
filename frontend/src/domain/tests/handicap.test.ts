import { describe, expect, it } from "vitest";
import {
  courseHandicap,
  formatCourseHandicap,
  formatHandicapIndex,
  formatHandicapInputValue,
  netScore,
  parseHandicapInput,
  ratedCourseHandicap,
} from "../handicap";

describe("parseHandicapInput", () => {
  it("reads blank as no handicap", () => {
    expect(parseHandicapInput("  ")).toEqual({ value: null, error: null });
  });

  it("reads a leading + as a plus handicap, stored negative", () => {
    expect(parseHandicapInput("+3.0")).toEqual({ value: -3, error: null });
    expect(parseHandicapInput("18.44")).toEqual({ value: 18.4, error: null });
  });

  it("refuses words and indexes outside +10 to 54", () => {
    expect(parseHandicapInput("scratch").error).toMatch(/must be a number/);
    expect(parseHandicapInput("62").error).toBe("Handicap must be between +10 and 54.");
    expect(parseHandicapInput("+11").error).toBe("Handicap must be between +10 and 54.");
  });
});

describe("formatHandicapInputValue", () => {
  it("writes an index back the way it is typed", () => {
    expect(formatHandicapInputValue(-3)).toBe("+3");
    expect(formatHandicapInputValue(18.4)).toBe("18.4");
    expect(formatHandicapInputValue(null)).toBe("");
  });
});

describe("courseHandicap", () => {
  it("matches the WHS rounded formula", () => {
    expect(courseHandicap(10.4, 130, 72.4, 72)).toBe(12);
  });
});

describe("ratedCourseHandicap", () => {
  it("returns null until HI, ratings, and par are all present", () => {
    const tee = { slope_rating: 130, course_rating: 72.4 };
    expect(ratedCourseHandicap(null, tee, 72)).toBeNull();
    expect(ratedCourseHandicap(10.4, { slope_rating: null, course_rating: 72.4 }, 72)).toBeNull();
    expect(ratedCourseHandicap(10.4, tee, 72)).toBe(12);
  });
});

describe("netScore / formatHandicapIndex", () => {
  it("subtracts course handicap from gross", () => {
    expect(netScore(78, 12)).toBe(66);
  });

  it("formats plus handicaps with a leading +", () => {
    expect(formatHandicapIndex(null)).toBe("—");
    expect(formatHandicapIndex(12.4)).toBe("12.4");
    expect(formatHandicapIndex(-1.2)).toBe("+1.2");
  });
});

describe("formatCourseHandicap", () => {
  it("writes a plus handicap with a plus, in whole strokes", () => {
    expect([formatCourseHandicap(12), formatCourseHandicap(0), formatCourseHandicap(-2), formatCourseHandicap(null)])
      .toEqual(["12", "0", "+2", "—"]);
  });
});
