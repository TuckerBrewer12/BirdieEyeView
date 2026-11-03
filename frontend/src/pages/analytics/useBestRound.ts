import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/data/queryKeys";
import { analyticsRepository, type AnalyticsRepository } from "./analyticsRepository";

export function useBestRound(
  roundId: string | null,
  repository: Pick<AnalyticsRepository, "getRound"> = analyticsRepository,
) {
  return useQuery({
    queryKey: queryKeys.round(roundId ?? undefined),
    queryFn: () => repository.getRound(roundId!),
    enabled: roundId != null,
  });
}
