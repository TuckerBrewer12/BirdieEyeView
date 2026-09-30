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
  /** False until the comparison loads, and when there is none. */
  show: boolean;
  charts: ComparisonChartItem[];
  /** The active tab's charts, for the one-tab-at-a-time mobile layout. */
  selectedCharts: ComparisonChartItem[];
  chartTab: ChartTabKey;
  chartTabs: ChartTabItem[];
  selectChartTab: (key: string) => void;
}

/** How this round compares with the golfer's others, one tab of charts at a time on mobile. */
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
