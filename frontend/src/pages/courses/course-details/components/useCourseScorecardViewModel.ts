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
  type TeeChip,
} from "../courseDetailModel";

export interface CourseScorecardViewModel {
  teeChips: TeeChip[];
  selectTee: (color: string) => void;
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
  const [picked, setPicked] = useState<string | null | undefined>(undefined);
  const { data: course } = useCourse(courseId, repository);
  const { data: analytics = EMPTY_COURSE_ANALYTICS } = useCourseAnalytics(userId, courseId, repository);
  if (!course) return null;

  const tee = selectedTee(course, picked);
  const averages = personalAverages(analytics);

  return {
    teeChips: teesByLength(course).map((t) => ({
      tee: t,
      selected: t.color?.toLowerCase() === tee?.color?.toLowerCase(),
      courseHandicap: t.course_handicap,
    })),
    selectTee: (color) => {
      const current = tee?.color ?? null;
      setPicked(current?.toLowerCase() === color.toLowerCase() ? null : color);
    },
    frontNine: nineFrom(course, "front", tee, averages),
    backNine: nineFrom(course, "back", tee, averages),
  };
}
