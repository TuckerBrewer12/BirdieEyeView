import { describe, expect, it } from "vitest";
import { courseResponse } from "@/testing/fakes/courseResponses";
import { emptyCourseAnalytics, halfMoonBayAnalytics } from "@/testing/fixtures/courseAnalytics";
import { halfMoonBayCourse } from "@/testing/fixtures/roundDetails";
import {
  chartsFrom,
  nineFrom,
  personalAverages,
  selectedTee,
} from "../courseDetailModel";

const PARS = [4, 4, 3, 5, 4, 4, 4, 3, 5, 4, 4, 3, 5, 4, 4, 4, 3, 5];

/** Every hole 400 yards off the blue tee, so each nine is 3600. */
const measured = courseResponse({
  id: "c1",
  name: "Measured",
  location: null,
  par: null,
  holes: PARS.map((par, i) => ({ number: i + 1, par, handicap: i + 1 })),
  tees: [
    {
      color: "Blue",
      total_yardage: null,
      hole_yardages: Object.fromEntries(PARS.map((_, i) => [i + 1, 400])),
      slope_rating: null,
      course_rating: null,
    },
  ],
});

describe("nineFrom", () => {
  it("reads each nine's par and yards off the course and tee, with totals only on the back", () => {
    const tee = measured.tees[0];
    const front = nineFrom(measured, "front", tee, null);
    const back = nineFrom(measured, "back", tee, null);

    expect(front.holes.map((h) => h.hole)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]);
    expect([front.par, front.yards, front.totals]).toEqual([36, 3600, null]);
    expect([back.par, back.yards]).toEqual([36, 3600]);
    expect(back.totals).toEqual({ par: 72, yards: 7200, personalAverage: null });
  });

  it("leaves yards empty when the tee has no hole yardages", () => {
    const blue = halfMoonBayCourse.tees[0];
    const back = nineFrom(halfMoonBayCourse, "back", blue, null);
    expect(back.holes[0]?.yards).toBeNull();
    expect(back.yards).toBeNull();
    expect(back.totals?.yards).toBe(6500);
  });

  it("adds the golfer's averages per hole, per nine, and for the course", () => {
    const averages = personalAverages(halfMoonBayAnalytics);
    const front = nineFrom(halfMoonBayCourse, "front", null, averages);
    const back = nineFrom(halfMoonBayCourse, "back", null, averages);

    expect(front.holes[0]?.personalAverage).toBe(3.5);
    expect(front.personalAverage).toBe(34.5);
    expect(back.totals?.personalAverage).toBe(69);
  });
});

describe("personalAverages", () => {
  it("is null until the golfer has played the course", () => {
    expect(personalAverages(emptyCourseAnalytics("course-hmb"))).toBeNull();
  });
});

describe("selectedTee", () => {
  it("follows the longest tee until the golfer picks, then their pick, then none once cleared", () => {
    expect(selectedTee(halfMoonBayCourse, undefined)?.color).toBe("Blue");
    expect(selectedTee(halfMoonBayCourse, "white")?.color).toBe("White");
    expect(selectedTee(halfMoonBayCourse, null)).toBeNull();
  });
});

describe("chartsFrom", () => {
  it("groups the hole-by-hole charts under the mobile tabs", () => {
    expect(chartsFrom(halfMoonBayAnalytics).map((chart) => [chart.kind, chart.group])).toEqual([
      ["toPar", "score"],
      ["scoreType", "score"],
      ["gir", "gir"],
      ["putts", "putts"],
      ["difficulty", "variance"],
      ["variance", "variance"],
    ]);
  });
});
