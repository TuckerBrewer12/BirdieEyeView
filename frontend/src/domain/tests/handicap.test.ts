import { describe, expect, it } from "vitest";
import {
  courseHandicap,
  differentialStatus,
  formatCourseHandicap,
  formatHandicapIndex,
  netScore,
  ratedCourseHandicap,
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

describe("differentialStatus", () => {
  it("counts used rounds, flags ones within two strokes of the cut-off, and leaves unrated rounds out", () => {
    expect(differentialStatus({ used_in_hi: true, hi_threshold: 12, differential: 10 })).toBe("counting");
    expect(differentialStatus({ used_in_hi: false, hi_threshold: 12, differential: 14 })).toBe("close");
    expect(differentialStatus({ used_in_hi: false, hi_threshold: 12, differential: 14.1 })).toBe("out");
    expect(differentialStatus({ used_in_hi: false, hi_threshold: null, differential: 13 })).toBe("out");
    expect(differentialStatus({ used_in_hi: null })).toBe("unrated");
  });
});
