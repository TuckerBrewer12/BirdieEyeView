import { describe, expect, it } from "vitest";
import type { CourseDto } from "@/types/api";
import { courseResponse, type StoredCourse, type StoredTee } from "@/testing/fakes/courseResponses";
import {
  chooseCompatibleTee,
  courseSummaryFrom,
  extractTeeColorToken,
  getHole,
  getTee,
  teeColors,
  teeRatingLabel,
  teesByLength,
} from "../course";

const white: StoredTee = {
  color: "White",
  total_yardage: 6200,
  hole_yardages: { 1: 350, 2: 400 },
  slope_rating: 125,
  course_rating: 71.2,
};

const blue: StoredTee = {
  color: "Blue",
  total_yardage: null,
  hole_yardages: { 1: 370, 2: 430 },
  slope_rating: 130,
  course_rating: 72.4,
};

function course(overrides: Partial<StoredCourse> = {}): CourseDto {
  return courseResponse({
    id: "c1",
    name: "Test",
    location: null,
    par: 72,
    holes: [
      { number: 1, par: 4, handicap: 7 },
      { number: 2, par: 5, handicap: 1 },
    ],
    tees: [white, blue],
    ...overrides,
  });
}

describe("getTee / getHole", () => {
  it("matches tee color case-insensitively", () => {
    expect(getTee(course(), "white")?.color).toBe("White");
    expect(getTee(course(), "GREEN")).toBeNull();
    expect(getTee(null, "White")).toBeNull();
  });

  it("finds a hole by number", () => {
    expect(getHole(course(), 2)?.par).toBe(5);
    expect(getHole(course(), 18)).toBeNull();
  });
});

describe("teesByLength", () => {
  it("puts the longest tee first", () => {
    expect(teesByLength(course()).map((tee) => tee.color)).toEqual(["White", "Blue"]);
    expect(teesByLength(course({ tees: [blue, white] })).map((tee) => tee.color)).toEqual(["White", "Blue"]);
  });

  it("lists tee colors", () => {
    expect(teeColors(course())).toEqual(["White", "Blue"]);
  });

  it("reads the colour word in a tee's name", () => {
    expect(extractTeeColorToken("Blue tees")).toBe("blue");
    expect(extractTeeColorToken("championship")).toBeNull();
  });

  it("matches an exact tee, then the same colour word", () => {
    expect(chooseCompatibleTee("Blue", ["Blue", "White"])).toBe("Blue");
    expect(chooseCompatibleTee("blue tees", ["Blue", "White"])).toBe("Blue");
    expect(chooseCompatibleTee("Gold", ["Blue", "White"])).toBeNull();
  });
});

describe("courseSummaryFrom", () => {
  it("reads a listed course, and keeps the provider's id for one found there", () => {
    expect(
      courseSummaryFrom({
        id: "external:9",
        name: "Torrey Pines",
        location: "La Jolla, CA",
        par: 72,
        total_holes: 18,
        tee_count: 4,
        source: "external",
        external_course_id: "ext-9",
      }),
    ).toEqual({
      id: "external:9",
      name: "Torrey Pines",
      location: "La Jolla, CA",
      par: 72,
      holeCount: 18,
      teeCount: 4,
      source: "external",
      externalId: "ext-9",
    });
  });
});

describe("teeRatingLabel", () => {
  it("writes the course rating over the slope", () => {
    expect(teeRatingLabel(71.2, 125)).toBe("71.2 / 125");
  });

  it("is null without both ratings", () => {
    expect(teeRatingLabel(71.2, null)).toBeNull();
    expect(teeRatingLabel(undefined, 125)).toBeNull();
  });
});
