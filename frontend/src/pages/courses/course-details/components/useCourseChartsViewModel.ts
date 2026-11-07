import { useMemo } from "react";
import { EMPTY_COURSE_ANALYTICS } from "@/domain/courseAnalytics";
import { coursesRepository, type CoursesRepository } from "../../coursesRepository";
import { useCourseAnalytics } from "../../useCourseAnalytics";
import { CHART_TABS, chartsFrom, type ChartTabKey, type CourseChart, type TabItem } from "../courseDetailModel";

export interface CourseChartsViewModel {
  charts: CourseChart[];
  /** The tabs the charts are grouped under on mobile. */
  chartTabs: TabItem<ChartTabKey>[];
}

/** The hole-by-hole charts at one course, one tab of them at a time on mobile. */
export function useCourseChartsViewModel(
  userId: string,
  courseId: string,
  repository: CoursesRepository = coursesRepository,
): CourseChartsViewModel {
  const { data: analytics = EMPTY_COURSE_ANALYTICS } = useCourseAnalytics(userId, courseId, repository);
  const charts = useMemo(() => chartsFrom(analytics), [analytics]);

  return { charts, chartTabs: CHART_TABS };
}
