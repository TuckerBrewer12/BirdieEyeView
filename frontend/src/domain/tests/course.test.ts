import { describe, expect, it } from "vitest";
import type { Course } from "@/types/golf";
import { courseResponse, type StoredCourse, type StoredTee } from "@/testing/fakes/courseResponses";
import {
  chooseCompatibleTee,
  extractTeeColorToken,
  getHole,
  getTee,
  longestTee,
  teeColors,
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

function course(overrides: Partial<StoredCourse> = {}): Course {
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

describe("longestTee", () => {
  it("picks the longest tee", () => {
    expect(longestTee(course())?.color).toBe("White");
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
