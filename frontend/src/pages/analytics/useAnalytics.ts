import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/data/queryKeys";
import { analyticsRepository, type AnalyticsRepository } from "./analyticsRepository";
import type { AnalyticsFilters } from "./model";

/**
 * The analytics figures for one set of filters, cached per set. While a new set loads, the last
 * set's figures stay on screen so the filters and charts don't blink out.
 */
export function useAnalytics(
  userId: string,
  filters: AnalyticsFilters,
  repository: AnalyticsRepository = analyticsRepository,
) {
  return useQuery({
    queryKey: queryKeys.analytics(userId, filters),
    queryFn: () => repository.getAnalytics(userId, filters),
    placeholderData: keepPreviousData,
  });
}
