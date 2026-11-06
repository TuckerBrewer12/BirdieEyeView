import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/data/queryKeys";
import { analyticsRepository, type AnalyticsRepository } from "./analyticsRepository";

/**
 * The round the server marked best in the window, in full so its card can be drawn. Round
 * detail reads the same cache entry, so opening it from the card needs no second fetch.
 */
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
