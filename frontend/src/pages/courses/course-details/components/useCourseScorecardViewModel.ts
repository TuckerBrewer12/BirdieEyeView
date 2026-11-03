import { EMPTY_COURSE_ANALYTICS } from "@/domain/courseAnalytics";
import { useState } from "react";
import { useHandicapIndex } from "@/data/useHandicapIndex";
import { teesByLength } from "@/domain/course";
import { ratedCourseHandicap } from "@/domain/handicap";
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
  teeChips: TeeChip[];
  selectTee: (color: string) => void;
  frontNine: ScorecardNine;
  backNine: ScorecardNine;
}

export function useCourseScorecardViewModel(
  userId: string,
  course: CourseDto,
  repository: CoursesRepository = coursesRepository,
): CourseScorecardViewModel {
  const [picked, setPicked] = useState<string | null | undefined>(undefined);
  const handicapIndex = useHandicapIndex(userId, repository);
  const { data: analytics = EMPTY_COURSE_ANALYTICS } = useCourseAnalytics(userId, course.id ?? undefined, repository);

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
