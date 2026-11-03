import { useMemo, useState } from "react";
import { EMPTY_COURSE_ANALYTICS } from "@/domain/courseAnalytics";
import { coursesRepository, type CoursesRepository } from "../../coursesRepository";
import { useCourseAnalytics } from "../../useCourseAnalytics";
import {
  CHART_TABS,
  chartsFrom,
  type ChartTabKey,
  type CourseChart,
  type TabItem,
} from "../courseDetailModel";

export interface CourseChartsViewModel {
  charts: CourseChart[];
  selectedCharts: CourseChart[];
  chartTab: ChartTabKey;
  chartTabs: TabItem<ChartTabKey>[];
  selectChartTab: (key: string) => void;
}

export function useCourseChartsViewModel(
  userId: string,
  courseId: string,
  repository: CoursesRepository = coursesRepository,
): CourseChartsViewModel {
  const [chartTab, setChartTab] = useState<ChartTabKey>("score");
  const { data: analytics = EMPTY_COURSE_ANALYTICS } = useCourseAnalytics(userId, courseId, repository);
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
