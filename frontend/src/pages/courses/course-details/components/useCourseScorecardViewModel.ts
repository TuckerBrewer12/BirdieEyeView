import { EMPTY_COURSE_ANALYTICS } from "@/domain/courseAnalytics";
import { useState } from "react";
import { teesByLength } from "@/domain/course";
import type { CourseDto } from "@/types/api";
import { coursesRepository, type CoursesRepository } from "../../coursesRepository";
import { useCourseAnalytics } from "../../useCourseAnalytics";
import {
  nineFrom,
  personalAverages,
  selectedTee,
  type ScorecardNine,
  type TeeChip,
} from "../courseDetailModel";

export interface CourseScorecardViewModel {
  /** Longest tee first. */
  teeChips: TeeChip[];
  /** Picks a tee, or clears it when it is already picked. */
  selectTee: (color: string) => void;
  frontNine: ScorecardNine;
  backNine: ScorecardNine;
}

/** The course's scorecard, read off one tee, with the golfer's averages once they have played it. */
export function useCourseScorecardViewModel(
  userId: string,
  course: CourseDto,
  repository: CoursesRepository = coursesRepository,
): CourseScorecardViewModel {
  // Undefined until the golfer picks: the scorecard then follows the longest tee.
  const [picked, setPicked] = useState<string | null | undefined>(undefined);
  const { data: analytics = EMPTY_COURSE_ANALYTICS } = useCourseAnalytics(userId, course.id ?? undefined, repository);

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
