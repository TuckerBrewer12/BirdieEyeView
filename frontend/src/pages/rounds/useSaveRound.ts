import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/data/queryKeys";
import type { RoundDetail, RoundEdits } from "@/domain";
import { roundsRepository, type RoundsRepository } from "./roundsRepository";

export interface SaveRoundVariables {
  round: RoundDetail;
  edits: RoundEdits;
}

export function useSaveRound(
  userId: string,
  repository: RoundsRepository = roundsRepository,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ round, edits }: SaveRoundVariables) => repository.saveRound(round, edits),
    onSuccess: (saved, { round }) => {
      queryClient.setQueryData(queryKeys.round(round.id), saved);
      for (const queryKey of [
        queryKeys.rounds(userId),
        queryKeys.roundComparison(userId, round.id),
        queryKeys.analytics(userId),
        queryKeys.dashboard(userId),
        queryKeys.allCourseLists(userId),
        queryKeys.allCourseAnalytics(userId),
      ]) {
        void queryClient.invalidateQueries({ queryKey });
      }
    },
    onError: (err) => console.error("Save failed:", err),
  });
}
