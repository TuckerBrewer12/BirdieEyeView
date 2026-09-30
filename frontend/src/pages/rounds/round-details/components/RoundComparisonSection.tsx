import { SectionLabel, ToggleGroup, ToggleGroupItem } from "@/brand";
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
      <div className="md:hidden">
        <ToggleGroup
          variant="outline"
          spacing={2}
          value={[viewModel.chartTab]}
          onValueChange={(values) => viewModel.selectChartTab(values[0] ?? "")}
          className="mb-4 max-w-full overflow-x-auto [scrollbar-width:none]"
        >
          {viewModel.chartTabs.map((tab) => (
            <ToggleGroupItem key={tab.key} value={tab.key}>
              {tab.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
        <div className={viewModel.selectedCharts.length > 1 ? "grid grid-cols-2 gap-3" : undefined}>
          {viewModel.selectedCharts.map((chart) => (
            <ComparisonChartCard
              key={chart.title}
              title={chart.title}
              bars={chart.bars}
              primaryLabel={chart.primaryLabel}
            />
          ))}
        </div>
      </div>
      <div className="hidden md:grid grid-cols-1 lg:grid-cols-2 gap-5">
        {viewModel.charts.map((chart) => (
          <ComparisonChartCard
            key={chart.title}
            title={chart.title}
            bars={chart.bars}
            primaryLabel={chart.primaryLabel}
          />
        ))}
      </div>
    </div>
  );
}
