import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/data/queryKeys";
import { roundsRepository, type RoundsRepository } from "../../roundsRepository";
import { CHART_TABS, chartsFrom, type ChartTabItem, type ComparisonChartItem } from "../roundDetailModel";

export interface RoundComparisonViewModel {
  /** False until the comparison loads, and when there is none. */
  show: boolean;
  charts: ComparisonChartItem[];
  /** The tabs the charts are grouped under on mobile. */
  chartTabs: ChartTabItem[];
}

/** How this round compares with the golfer's others, one tab of charts at a time on mobile. */
export function useRoundComparisonViewModel(
  userId: string,
  roundId: string,
  repository: RoundsRepository = roundsRepository,
): RoundComparisonViewModel {
  const { data: comparison } = useQuery({
    queryKey: queryKeys.roundComparison(userId, roundId),
    queryFn: () => repository.getRoundComparison(userId, roundId),
  });

  return {
    show: comparison != null,
    charts: comparison ? chartsFrom(comparison) : [],
    chartTabs: CHART_TABS,
  };
}
