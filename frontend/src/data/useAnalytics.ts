import { useQuery } from "@tanstack/react-query";
import type { AnalyticsFilters } from "@/types/analytics";
import type { AnalyticsDto } from "@/types/api";
import { analyticsRepository, type AnalyticsRepository } from "./analyticsRepository";
import { queryKeys } from "./queryKeys";

/**
 * A golfer's analytics for one set of filters, cached per golfer and set: the Analytics page's
 * filters, or The Lab's last 20 rounds, the golfer's own or a friend's. Each screen passes
 * `select` to shape the one cached response its own way. Waits while `userId` is null.
 *
 * While a new set of filters loads, the last set's figures stay on screen so the charts don't
 * blink out. They are never kept across golfers: one golfer's figures never stand in for another's.
 */
export function useAnalytics<T>(
  userId: string | null,
  filters: AnalyticsFilters,
  select: (analytics: AnalyticsDto) => T,
  repository: AnalyticsRepository = analyticsRepository,
) {
  return useQuery({
    queryKey: queryKeys.analytics(userId ?? "", filters),
    queryFn: () => repository.getAnalytics(userId!, filters),
    select,
    enabled: userId != null,
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[1] === userId ? previous : undefined,
  });
}
