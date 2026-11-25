import { useMutation, useQueryClient } from "@tanstack/react-query";
import { roundsChanged } from "@/data/playerCache";
import { queryKeys } from "@/data/queryKeys";
import { roundsRepository, type RoundsRepository } from "./roundsRepository";

export function useDeleteRound(
  userId: string,
  repository: RoundsRepository = roundsRepository,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (roundId: string) => repository.deleteRound(roundId),
    onSuccess: (_, roundId) => {
      queryClient.removeQueries({ queryKey: queryKeys.round(roundId), exact: true });
      queryClient.removeQueries({ queryKey: queryKeys.roundComparison(userId, roundId), exact: true });
      void roundsChanged(queryClient, userId);
    },
    onError: (err) => console.error("Delete failed:", err),
  });
}
