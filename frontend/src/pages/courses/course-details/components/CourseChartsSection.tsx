import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  ChartTabs,
  HoleMetricBars,
  HoleScoreMixBars,
  HoleToParBars,
  SectionLabel,
} from "@/brand";
import type { CourseChart } from "../courseDetailModel";
import { useCourseChartsViewModel } from "./useCourseChartsViewModel";

const CHART_TITLES: Record<CourseChart["kind"], string> = {
  toPar: "Average Score To Par By Hole",
  scoreType: "Score Type Distribution By Hole",
  gir: "GIR Percentage By Hole",
  putts: "Average Putts By Hole",
  difficulty: "Course Difficulty Profile (Hardest To Easiest)",
  variance: "Score Variance By Hole (Std Dev)",
};

function chartFor(chart: CourseChart) {
  switch (chart.kind) {
    case "toPar":
      return <HoleToParBars rows={chart.rows} />;
    case "difficulty":
      return <HoleToParBars rows={chart.rows} ranked />;
    case "scoreType":
      return <HoleScoreMixBars rows={chart.rows} />;
    case "gir":
      return <HoleMetricBars metric="gir" rows={chart.rows} />;
    case "putts":
      return <HoleMetricBars metric="putts" rows={chart.rows} />;
    case "variance":
      return <HoleMetricBars metric="variance" rows={chart.rows} />;
  }
}

interface CourseChartsSectionProps {
  userId: string;
  courseId: string;
}

export function CourseChartsSection({ userId, courseId }: CourseChartsSectionProps) {
  const viewModel = useCourseChartsViewModel(userId, courseId);

  return (
    <div>
      <SectionLabel>Hole-by-Hole Breakdown</SectionLabel>
      <ChartTabs
        tabs={viewModel.chartTabs}
        value={viewModel.chartTab}
        onValueChange={viewModel.selectChartTab}
        charts={viewModel.charts}
        selectedCharts={viewModel.selectedCharts}
        keyFor={(chart) => chart.kind}
        renderChart={(chart) => (
          <Card>
            <CardHeader>
              <CardTitle>{CHART_TITLES[chart.kind]}</CardTitle>
            </CardHeader>
            <CardContent>{chartFor(chart)}</CardContent>
          </Card>
        )}
      />
    </div>
  );
}
