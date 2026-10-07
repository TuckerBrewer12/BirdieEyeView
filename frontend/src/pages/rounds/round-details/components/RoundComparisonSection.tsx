import { ChartTabs, SectionLabel } from "@/brand";
import { ComparisonChartCard } from "./ComparisonChartCard";
import { useRoundComparisonViewModel } from "./useRoundComparisonViewModel";

interface RoundComparisonSectionProps {
  userId: string;
  roundId: string;
}

export function RoundComparisonSection({ userId, roundId }: RoundComparisonSectionProps) {
  const viewModel = useRoundComparisonViewModel(userId, roundId);
  if (!viewModel.show) return null;

  return (
    <div className="mt-8">
      <SectionLabel>Round Comparison</SectionLabel>
      <ChartTabs
        tabs={viewModel.chartTabs}
        value={viewModel.chartTab}
        onValueChange={viewModel.selectChartTab}
        charts={viewModel.charts}
        selectedCharts={viewModel.selectedCharts}
        keyFor={(chart) => chart.title}
        mobileLayout="pairs"
        renderChart={(chart) => (
          <ComparisonChartCard title={chart.title} bars={chart.bars} primaryLabel={chart.primaryLabel} />
        )}
      />
    </div>
  );
}
