import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";
import { roundRepository, type RoundRepository } from "./roundRepository";

/**
 * A round in full. Round detail, the scan's success screen and the analytics best-round card
 * share this one entry, so opening a round from either card needs no second fetch. Saving or
 * linking the round writes or refetches it. Waits while `roundId` is unset.
 */
export function useRound(roundId: string | null | undefined, repository: RoundRepository = roundRepository) {
  return useQuery({
    queryKey: queryKeys.round(roundId ?? undefined),
    queryFn: () => repository.getRound(roundId!),
    enabled: roundId != null,
    staleTime: 5 * 60 * 1000,
  });
}
