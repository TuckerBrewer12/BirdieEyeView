import { useState } from "react";
import type { CourseAnalytics } from "@/domain/courseAnalytics";
import { formatCourseName } from "@/domain/course";
import type { RoundSummary } from "@/domain/round";
import { messageFrom } from "@/lib/userFacingErrors";
import type { CourseDto, TeeDto } from "@/types/api";
import { coursesRepository, type CoursesRepository } from "../coursesRepository";
import { useCourse } from "../useCourse";
import { useCourseAnalytics } from "../useCourseAnalytics";
import { RECENT_ROUNDS, namedTees, nineFrom, selectedTee, type ScorecardNine } from "./courseDetailModel";

export interface CourseDetailPageViewModel {
  loading: boolean;
  loadError: string | null;
  course: CourseDto | null;
  courseName: string;
  /** The tees by name, longest first, with their yardage. */
  tees: { name: string; yards: number | null }[];
  /** The tee the scorecard reads: the golfer's pick, or the longest. */
  tee: TeeDto | null;
  selectTee: (name: string) => void;
  nines: ScorecardNine[];
  /** Whether the golfer has a round here: their record and rounds show, or the prompt to scan one. */
  played: boolean;
  /** Their figures here, once they have a round. */
  analytics: CourseAnalytics | null;
  /** Their latest rounds here, newest first. */
  recentRounds: RoundSummary[];
}

/**
 * The course page: the scorecard off the tee the golfer picks, with their average to par and greens
 * per hole once they have played here, their record, and their latest rounds. The server works out
 * every figure.
 */
export function useCourseDetailPageViewModel(
  userId: string,
  courseId: string | undefined,
  repository: CoursesRepository = coursesRepository,
): CourseDetailPageViewModel {
  // Null until the golfer picks: the scorecard then follows the longest tee.
  const [picked, setPicked] = useState<string | null>(null);
  const { data: course, isLoading: courseLoading, isError, error } = useCourse(courseId, repository);
  const { data: analytics, isLoading: analyticsLoading } = useCourseAnalytics(userId, courseId, repository);
  const played = (analytics?.roundsPlayed ?? 0) > 0;
  const golfer: CourseAnalytics | null = played && analytics ? analytics : null;
  const tee = course ? selectedTee(course, picked) : null;

  return {
    loading: !!courseId && (courseLoading || analyticsLoading),
    loadError: isError ? messageFrom(error, "Course not found.") : null,
    course: course ?? null,
    courseName: formatCourseName(course?.name),
    tees: course ? namedTees(course).flatMap((t) => (t.color ? [{ name: t.color, yards: t.total_yardage }] : [])) : [],
    tee,
    selectTee: setPicked,
    nines: course ? [nineFrom(course, "front", tee, golfer), nineFrom(course, "back", tee, golfer)] : [],
    played,
    analytics: golfer,
    recentRounds: golfer ? golfer.rounds.slice(0, RECENT_ROUNDS) : [],
  };
}
