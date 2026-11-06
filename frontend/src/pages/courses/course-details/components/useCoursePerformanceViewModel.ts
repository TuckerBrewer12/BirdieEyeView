import { EMPTY_COURSE_ANALYTICS, bestRoundPlace, type RoundSummary, type RoundTrendPoint } from "@/domain";
import { coursesRepository, type CoursesRepository } from "../../coursesRepository";
import { useCourseAnalytics } from "../../useCourseAnalytics";

export interface CoursePerformanceViewModel {
  roundsPlayed: number;
  scoringAverage: number | null;
  bestScore: number | null;
  worstScore: number | null;
  /** Every round here, oldest first. The chart plots the scored ones. */
  trend: RoundTrendPoint[];
  /** The server's best round's place on `trend`. Null when it ranked none. */
  bestAt: number | null;
  /** The last five rounds' average and its change on the first five, as the server sent them. */
  recentAverage: number | null;
  recentAverageChange: number | null;
  /** The golfer's rounds at this course, newest first. */
  rounds: RoundSummary[];
}

/** How the golfer has scored at one course. The server works out every figure. */
export function useCoursePerformanceViewModel(
  userId: string,
  courseId: string,
  repository: CoursesRepository = coursesRepository,
): CoursePerformanceViewModel {
  const { data: analytics = EMPTY_COURSE_ANALYTICS } = useCourseAnalytics(userId, courseId, repository);

  return {
    roundsPlayed: analytics.roundsPlayed,
    scoringAverage: analytics.scoringAverage,
    bestScore: analytics.bestScore,
    worstScore: analytics.worstScore,
    trend: analytics.scoreTrend,
    bestAt: bestRoundPlace(analytics.rounds, analytics.scoreTrend),
    recentAverage: analytics.recentAverage,
    recentAverageChange: analytics.recentAverageChange,
    rounds: analytics.rounds,
  };
}
