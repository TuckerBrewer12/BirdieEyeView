import { useState } from "react";
import { useHandicapIndex } from "@/data/useHandicapIndex";
import { teesByLength } from "@/domain/course";
import { ratedCourseHandicap } from "@/domain/handicap";
import type { Course } from "@/types/golf";
import { coursesRepository, type CoursesRepository } from "../../coursesRepository";
import { useCourseAnalytics } from "../../useCourseAnalytics";
import {
  EMPTY_ANALYTICS,
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
  course: Course,
  repository: CoursesRepository = coursesRepository,
): CourseScorecardViewModel {
  // Undefined until the golfer picks: the scorecard then follows the longest tee.
  const [picked, setPicked] = useState<string | null | undefined>(undefined);
  const handicapIndex = useHandicapIndex(userId, repository);
  const { data: analytics = EMPTY_ANALYTICS } = useCourseAnalytics(userId, course.id ?? undefined, repository);

  const tee = selectedTee(course, picked);
  const averages = personalAverages(analytics);

  return {
    teeChips: teesByLength(course).map((t) => ({
      tee: t,
      selected: t.color?.toLowerCase() === tee?.color?.toLowerCase(),
      courseHandicap: ratedCourseHandicap(handicapIndex, t, course.par),
    })),
    selectTee: (color) => {
      const current = tee?.color ?? null;
      setPicked(current?.toLowerCase() === color.toLowerCase() ? null : color);
    },
    frontNine: nineFrom(course, "front", tee, averages),
    backNine: nineFrom(course, "back", tee, averages),
  };
}
