import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/data/queryKeys";
import type { BenchmarkTarget } from "@/domain/benchmark";
import { labRepository, type LabRepository } from "./labRepository";

export function useBenchmarkComparison(
  userId: string,
  target: BenchmarkTarget | null,
  repository: Pick<LabRepository, "getBenchmarkComparison"> = labRepository,
) {
  return useQuery({
    queryKey: queryKeys.benchmarkComparison(userId, target),
    queryFn: () => repository.getBenchmarkComparison(userId, target!),
    enabled: target != null,
  });
}
