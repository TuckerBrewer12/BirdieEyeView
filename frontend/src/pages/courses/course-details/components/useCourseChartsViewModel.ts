import { useMemo, useState } from "react";
import { coursesRepository, type CoursesRepository } from "../../coursesRepository";
import { useCourseAnalytics } from "../../useCourseAnalytics";
import {
  CHART_TABS,
  EMPTY_ANALYTICS,
  chartsFrom,
  type ChartTabKey,
  type CourseChart,
  type TabItem,
} from "../courseDetailModel";

export interface CourseChartsViewModel {
  charts: CourseChart[];
  /** The active tab's charts, for the one-tab-at-a-time mobile layout. */
  selectedCharts: CourseChart[];
  chartTab: ChartTabKey;
  chartTabs: TabItem<ChartTabKey>[];
  selectChartTab: (key: string) => void;
}

/** The hole-by-hole charts at one course, one tab of them at a time on mobile. */
export function useCourseChartsViewModel(
  userId: string,
  courseId: string,
  repository: CoursesRepository = coursesRepository,
): CourseChartsViewModel {
  const [chartTab, setChartTab] = useState<ChartTabKey>("score");
  const { data: analytics = EMPTY_ANALYTICS } = useCourseAnalytics(userId, courseId, repository);
  const charts = useMemo(() => chartsFrom(analytics), [analytics]);

  return {
    charts,
    selectedCharts: charts.filter((chart) => chart.group === chartTab),
    chartTab,
    chartTabs: CHART_TABS,
    selectChartTab: (key) => {
      if (CHART_TABS.some((tab) => tab.key === key)) setChartTab(key as ChartTabKey);
    },
  };
}
