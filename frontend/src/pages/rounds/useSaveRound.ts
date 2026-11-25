import { useMutation, useQueryClient } from "@tanstack/react-query";
import { roundsChanged } from "@/data/playerCache";
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
      void roundsChanged(queryClient, userId, [queryKeys.round(round.id)]);
    },
    onError: (err) => console.error("Save failed:", err),
  });
}
