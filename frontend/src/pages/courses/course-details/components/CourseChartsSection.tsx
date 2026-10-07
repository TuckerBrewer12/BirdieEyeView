import { SectionLabel } from "@/brand";
import { CourseCharts } from "./CourseCharts";
import { useCourseChartsViewModel } from "./useCourseChartsViewModel";

interface CourseChartsSectionProps {
  userId: string;
  courseId: string;
}

export function CourseChartsSection({ userId, courseId }: CourseChartsSectionProps) {
  const viewModel = useCourseChartsViewModel(userId, courseId);

  return (
    <div>
      <SectionLabel>Hole-by-Hole Breakdown</SectionLabel>
      <CourseCharts
        charts={viewModel.charts}
        selectedCharts={viewModel.selectedCharts}
        chartTabs={viewModel.chartTabs}
        chartTab={viewModel.chartTab}
        onSelectChartTab={viewModel.selectChartTab}
      />
    </div>
  );
}
