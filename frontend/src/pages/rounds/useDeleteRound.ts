import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/data/queryKeys";
import { roundsRepository, type RoundsRepository } from "./roundsRepository";

/** Deletes a round, and refetches every screen that counted it, the courses' records too. */
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
        queryKeys.analytics(userId),
        queryKeys.allCourseLists(userId),
        queryKeys.allCourseAnalytics(userId),
      ]) {
        void queryClient.invalidateQueries({ queryKey });
      }
    },
    onError: (err) => console.error("Delete failed:", err),
  });
}
