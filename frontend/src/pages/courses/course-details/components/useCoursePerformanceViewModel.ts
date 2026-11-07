import { EMPTY_COURSE_ANALYTICS, type RoundSummary, type ScorePoint } from "@/domain";
import { messageFrom } from "@/lib/userFacingErrors";
import { coursesRepository, type CoursesRepository } from "../../coursesRepository";
import { useCourseAnalytics } from "../../useCourseAnalytics";

export interface CoursePerformanceViewModel {
  /** No figures yet: the page waits for the first load, so this is a retry after a failed one. */
  loading: boolean;
  /** The figures failed to load and there are none to show. */
  loadError: string | null;
  retry: () => void;
  roundsPlayed: number;
  scoringAverage: number | null;
  bestScore: number | null;
  worstScore: number | null;
  /** Every round here, oldest first. The chart plots the scored ones. */
  trend: ScorePoint[];
  /** The golfer's rounds at this course, newest first. */
  rounds: RoundSummary[];
}

/** How the golfer has scored at one course. The server works out every figure. */
export function useCoursePerformanceViewModel(
  userId: string,
  courseId: string,
  repository: CoursesRepository = coursesRepository,
): CoursePerformanceViewModel {
  const { data, isPending, isError, error, refetch } = useCourseAnalytics(userId, courseId, repository);
  const analytics = data ?? EMPTY_COURSE_ANALYTICS;

  return {
    loading: isPending,
    loadError: isError && !data ? messageFrom(error, "Could not load your rounds at this course.") : null,
    retry: () => void refetch(),
    roundsPlayed: analytics.roundsPlayed,
    scoringAverage: analytics.scoringAverage,
    bestScore: analytics.bestScore,
    worstScore: analytics.worstScore,
    trend: analytics.scoreTrend,
    rounds: analytics.rounds,
  };
}
