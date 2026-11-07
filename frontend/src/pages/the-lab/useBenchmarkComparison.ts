import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/data/queryKeys";
import type { BenchmarkTarget } from "@/domain/benchmark";
import { labRepository, type LabRepository } from "./labRepository";

/**
 * The server's comparison of the golfer's last 20 rounds with one benchmark, or with none for a
 * null target, cached per benchmark. A comparison never stands in for another's while the next
 * one loads.
 */
export function useBenchmarkComparison(
  userId: string,
  target: BenchmarkTarget | null,
  repository: Pick<LabRepository, "getBenchmarkComparison"> = labRepository,
) {
  return useQuery({
    queryKey: queryKeys.benchmarkComparison(userId, target),
    queryFn: () => repository.getBenchmarkComparison(userId, target),
  });
}
