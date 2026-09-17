import { describe, expect, it } from "vitest";
import type { Course, Tee } from "@/types/golf";
import {
  coursePar,
  getHole,
  getTee,
  longestTee,
  teeColors,
  teeYards,
} from "./course";

const white: Tee = {
  color: "White",
  total_yardage: 6200,
  hole_yardages: { 1: 350, 2: 400 },
  slope_rating: 125,
  course_rating: 71.2,
};

const blue: Tee = {
  color: "Blue",
  total_yardage: null,
  hole_yardages: { 1: 370, 2: 430 },
  slope_rating: 130,
  course_rating: 72.4,
};

function course(overrides: Partial<Course> = {}): Course {
  return {
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
  };
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

describe("coursePar", () => {
  it("prefers the stored par", () => {
    expect(coursePar(course({ par: 71 }))).toBe(71);
  });

  it("sums hole pars when stored par is missing and every hole has par", () => {
    expect(coursePar(course({ par: null }))).toBe(9);
  });

  it("returns null when a hole par is missing", () => {
    expect(
      coursePar(
        course({
          par: null,
          holes: [
            { number: 1, par: 4, handicap: 1 },
            { number: 2, par: null, handicap: 2 },
          ],
        }),
      ),
    ).toBeNull();
  });
});

describe("teeYards / longestTee", () => {
  it("uses stored yardage, then the hole-yardage sum", () => {
    expect(teeYards(white)).toBe(6200);
    expect(teeYards(blue)).toBe(800);
  });

  it("picks the longest tee", () => {
    expect(longestTee(course())?.color).toBe("White");
  });

  it("lists tee colors", () => {
    expect(teeColors(course())).toEqual(["White", "Blue"]);
  });
});
