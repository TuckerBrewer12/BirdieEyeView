import { useMemo } from "react";
import { Round } from "@/domain";
import { coursesRepository, type CoursesRepository } from "../../coursesRepository";
import { useCourseAnalytics } from "../../useCourseAnalytics";
import { EMPTY_ANALYTICS, trendFrom, type TrendPoint } from "../courseDetailModel";

export interface CoursePerformanceViewModel {
  roundsPlayed: number;
  scoringAverage: number | null;
  bestScore: number | null;
  worstScore: number | null;
  /** Scored rounds, oldest first. */
  trend: TrendPoint[];
  /** The golfer's rounds at this course, newest first. */
  rounds: Round[];
}

/** How the golfer has scored at one course. The server works out every figure. */
export function useCoursePerformanceViewModel(
  userId: string,
  courseId: string,
  repository: CoursesRepository = coursesRepository,
): CoursePerformanceViewModel {
  const { data: analytics = EMPTY_ANALYTICS } = useCourseAnalytics(userId, courseId, repository);
  const trend = useMemo(() => trendFrom(analytics.score_trend_on_course), [analytics.score_trend_on_course]);
  const rounds = useMemo(() => analytics.rounds.map(Round.fromSummary), [analytics.rounds]);

  return {
    roundsPlayed: analytics.rounds_played,
    scoringAverage: analytics.scoring_average,
    bestScore: analytics.best_score,
    worstScore: analytics.worst_score,
    trend,
    rounds,
  };
}
