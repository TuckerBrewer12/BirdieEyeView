import type { CourseDto, HoleDto, TeeDto } from "../../types/api";

/**
 * The fake backend's copy of api/course_responses.py and models/course.py: a course is stored
 * as facts, and every response carries the figures the real server works out from them.
 */

export interface StoredTee {
  color: string | null;
  total_yardage: number | null;
  hole_yardages: Record<number, number>;
  slope_rating: number | null;
  course_rating: number | null;
}

export interface StoredCourse {
  id: string | null;
  name: string | null;
  location: string | null;
  par: number | null;
  holes: HoleDto[];
  tees: StoredTee[];
  external_course_id?: string | null;
  user_id?: string | null;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

/** Stored par, else the sum of all 18 holes once every one has a par. */
export function coursePar(course: StoredCourse): number | null {
  if (course.par != null) return course.par;
  if (course.holes.length !== 18 || course.holes.some((h) => h.par == null)) return null;
  return sum(course.holes.map((h) => h.par!));
}

function ninePar(course: StoredCourse, first: number): number | null {
  const nine = course.holes.filter((h) => h.number != null && h.number >= first && h.number < first + 9);
  if (nine.length < 9 || nine.some((h) => h.par == null)) return null;
  return sum(nine.map((h) => h.par!));
}

function nineYardage(tee: StoredTee, first: number): number | null {
  const yards = Array.from({ length: 9 }, (_, i) => tee.hole_yardages[first + i]);
  if (yards.some((y) => y == null)) return null;
  return sum(yards);
}

function teeResponse(tee: StoredTee): TeeDto {
  const holeYards = Object.values(tee.hole_yardages);
  return {
    color: tee.color,
    slope_rating: tee.slope_rating,
    course_rating: tee.course_rating,
    hole_yardages: tee.hole_yardages,
    total_yardage: tee.total_yardage ?? (holeYards.length > 0 ? sum(holeYards) : null),
    front_nine_yardage: nineYardage(tee, 1),
    back_nine_yardage: nineYardage(tee, 10),
  };
}

export function courseResponse(course: StoredCourse): CourseDto {
  return {
    id: course.id,
    name: course.name,
    external_course_id: course.external_course_id ?? null,
    location: course.location,
    user_id: course.user_id ?? null,
    par: coursePar(course),
    front_nine_par: ninePar(course, 1),
    back_nine_par: ninePar(course, 10),
    holes: course.holes,
    tees: course.tees.map(teeResponse),
  };
}
