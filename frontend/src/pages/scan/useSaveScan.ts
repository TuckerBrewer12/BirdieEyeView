import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/data/queryKeys";
import { scanRepository, type ScanRepository } from "@/data/scanRepository";
import type { SaveScanRequestDto } from "@/types/api";

/**
 * Saves a checked scan as a new round and resolves to its id. Every screen that counts
 * rounds — the list, the dashboard, the handicap, the analytics — refetches.
 */
export function useSaveScan(userId: string, repository: ScanRepository = scanRepository) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: SaveScanRequestDto) => repository.save(request),
    onSuccess: () => {
      for (const queryKey of [
        queryKeys.rounds(userId),
        queryKeys.dashboard(userId),
        queryKeys.handicap(userId),
        queryKeys.analytics(userId),
        queryKeys.goalReport(userId),
        queryKeys.playedCourses(userId),
      ]) {
        void queryClient.invalidateQueries({ queryKey });
      }
    },
  });
}
