import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/data/queryKeys";
import { roundsRepository, type RoundsRepository } from "../rounds/roundsRepository";

/**
 * The round a scan was just saved as. Round detail reads the same cache entry, so opening
 * it from the success screen needs no second fetch.
 */
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
