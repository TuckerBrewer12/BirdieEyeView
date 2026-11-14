import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/data/queryKeys";
import type { BenchmarkTarget } from "@/domain/benchmark";
import { analyticsRepository, type AnalyticsRepository } from "./analyticsRepository";

export function useBenchmarkComparison(
  userId: string,
  target: BenchmarkTarget | null,
  repository: Pick<AnalyticsRepository, "getBenchmarkComparison"> = analyticsRepository,
) {
  return useQuery({
    queryKey: queryKeys.benchmarkComparison(userId, target),
    queryFn: () => repository.getBenchmarkComparison(userId, target!),
    enabled: target != null,
  });
}
