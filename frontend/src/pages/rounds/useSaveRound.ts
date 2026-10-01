import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/data/queryKeys";
import { roundsRepository, type RoundsRepository, type UpdateRoundBody } from "./roundsRepository";

export interface SaveRoundVariables {
  roundId: string;
  /** Linked first, when the golfer picked a different saved course. */
  linkCourseId: string | null;
  body: UpdateRoundBody;
}

/**
 * Saves an edited round. The detail cache takes the saved round, and every
 * screen that shows its figures (the list, comparison, career, dashboard)
 * refetches.
 */
export function useSaveRound(
  userId: string,
  repository: RoundsRepository = roundsRepository,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ roundId, linkCourseId, body }: SaveRoundVariables) => {
      if (linkCourseId) await repository.linkCourse(roundId, linkCourseId);
      return repository.updateRound(roundId, body);
    },
    onSuccess: (updated, { roundId }) => {
      queryClient.setQueryData(queryKeys.round(roundId), updated);
      for (const queryKey of [
        queryKeys.rounds(userId),
        queryKeys.roundComparison(userId, roundId),
        queryKeys.careerAnalytics(userId),
        queryKeys.dashboard(userId),
      ]) {
        void queryClient.invalidateQueries({ queryKey });
      }
    },
    onError: (err) => console.error("Save failed:", err),
  });
}
