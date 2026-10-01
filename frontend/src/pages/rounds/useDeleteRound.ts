import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/data/queryKeys";
import { roundsRepository, type RoundsRepository } from "./roundsRepository";

/** Deletes a round, and refetches every screen that counted it. */
export function useDeleteRound(
  userId: string,
  repository: RoundsRepository = roundsRepository,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roundId: string) => repository.deleteRound(roundId),
    onSuccess: () => {
      for (const queryKey of [
        queryKeys.rounds(userId),
        queryKeys.dashboard(userId),
        queryKeys.careerAnalytics(userId),
      ]) {
        void queryClient.invalidateQueries({ queryKey });
      }
    },
    onError: (err) => console.error("Delete failed:", err),
  });
}
