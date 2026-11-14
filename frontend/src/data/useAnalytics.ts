import { useQuery } from "@tanstack/react-query";
import type { AnalyticsFilters } from "@/domain/analyticsFilters";
import type { AnalyticsDto } from "@/types/api";
import { analyticsRepository, type AnalyticsRepository } from "./analyticsRepository";
import { queryKeys } from "./queryKeys";

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
