import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/data/queryKeys";
import { roundsRepository, type RoundsRepository } from "../../roundsRepository";
import {
  CHART_TABS,
  chartsFrom,
  type ChartTabItem,
  type ChartTabKey,
  type ComparisonChartItem,
} from "../roundDetailModel";

export interface RoundComparisonViewModel {
  show: boolean;
  charts: ComparisonChartItem[];
  selectedCharts: ComparisonChartItem[];
  chartTab: ChartTabKey;
  chartTabs: ChartTabItem[];
  selectChartTab: (key: string) => void;
}

export function useRoundComparisonViewModel(
  userId: string,
  roundId: string,
  repository: RoundsRepository = roundsRepository,
): RoundComparisonViewModel {
  const [chartTab, setChartTab] = useState<ChartTabKey>("score");
  const { data: comparison } = useQuery({
    queryKey: queryKeys.roundComparison(userId, roundId),
    queryFn: () => repository.getRoundComparison(userId, roundId),
  });

  const charts = comparison ? chartsFrom(comparison) : [];
  return {
    show: comparison != null,
    charts,
    selectedCharts: charts.filter((chart) => chart.group === chartTab),
    chartTab,
    chartTabs: CHART_TABS,
    selectChartTab: (key) => {
      if (CHART_TABS.some((tab) => tab.key === key)) setChartTab(key as ChartTabKey);
    },
  };
}
