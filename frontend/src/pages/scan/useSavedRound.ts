import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/data/queryKeys";
import { roundsRepository, type RoundsRepository } from "../rounds/roundsRepository";

export function useSavedRound(
  roundId: string | null,
  repository: Pick<RoundsRepository, "getRound"> = roundsRepository,
) {
  return useQuery({
    queryKey: queryKeys.round(roundId ?? undefined),
    queryFn: () => repository.getRound(roundId!),
    enabled: roundId != null,
  });
}
