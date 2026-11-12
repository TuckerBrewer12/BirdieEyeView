import { EMPTY_COURSE_ANALYTICS } from "@/domain/courseAnalytics";
import { useState } from "react";
import { teesByLength } from "@/domain/course";
import { coursesRepository, type CoursesRepository } from "../../coursesRepository";
import { useCourse } from "../../useCourse";
import { useCourseAnalytics } from "../../useCourseAnalytics";
import {
  nineFrom,
  personalAverages,
  selectedTee,
  type ScorecardNine,
  type ScorecardTee,
} from "../courseDetailModel";

export interface CourseScorecardViewModel {
  /** Longest tee first. */
  tees: ScorecardTee[];
  /** The tee the scorecard reads, or null once the golfer clears it. */
  selectedTee: string | null;
  selectTee: (color: string) => void;
  /** Picks no tee: the scorecard drops its yards row. */
  clearTee: () => void;
  frontNine: ScorecardNine;
  backNine: ScorecardNine;
}

/**
 * The course's scorecard, read off one tee, with the golfer's averages once they have played it.
 * Null until the course has loaded; the page loads it first, so this reads it from the cache.
 */
export function useCourseScorecardViewModel(
  userId: string,
  courseId: string,
  repository: CoursesRepository = coursesRepository,
): CourseScorecardViewModel | null {
  // Undefined until the golfer picks: the scorecard then follows the longest tee.
  const [picked, setPicked] = useState<string | null | undefined>(undefined);
  const { data: course } = useCourse(courseId, repository);
  const { data: analytics = EMPTY_COURSE_ANALYTICS } = useCourseAnalytics(userId, courseId, repository);
  if (!course) return null;

  const tee = selectedTee(course, picked);
  const averages = personalAverages(analytics);

  return {
    tees: teesByLength(course).map((t) => ({ tee: t, courseHandicap: t.course_handicap })),
    selectedTee: tee?.color ?? null,
    selectTee: setPicked,
    clearTee: () => setPicked(null),
    frontNine: nineFrom(course, "front", tee, averages),
    backNine: nineFrom(course, "back", tee, averages),
  };
}
