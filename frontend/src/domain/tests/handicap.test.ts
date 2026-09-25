import { describe, expect, it } from "vitest";
import {
  courseHandicap,
  formatHandicapIndex,
  netScore,
  ratedCourseHandicap,
  whsWindow,
} from "../handicap";

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

describe("netScore / formatHandicapIndex / whsWindow", () => {
  it("subtracts course handicap from gross", () => {
    expect(netScore(78, 12)).toBe(66);
  });

  it("formats plus handicaps with a leading +", () => {
    expect(formatHandicapIndex(null)).toBe("—");
    expect(formatHandicapIndex(12.4)).toBe("12.4");
    expect(formatHandicapIndex(-1.2)).toBe("+1.2");
  });

  it("looks up differentials used from rated-round count", () => {
    expect(whsWindow(2)).toEqual({ countUsed: 0, adjustment: 0 });
    expect(whsWindow(3)).toEqual({ countUsed: 1, adjustment: -2 });
    expect(whsWindow(20)).toEqual({ countUsed: 8, adjustment: 0 });
    expect(whsWindow(40)).toEqual({ countUsed: 8, adjustment: 0 });
  });
});
