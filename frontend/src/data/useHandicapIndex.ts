import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";
import { userRepository, type UserRepository } from "./userRepository";

/**
 * The golfer's handicap index, or null while it loads, if it fails, or if they have none.
 * Every screen that reads it shares this one query, so they share one cache entry.
 */
export function useHandicapIndex(
  userId: string,
  repository: Pick<UserRepository, "getUserHandicap"> = userRepository,
): number | null {
  const { data } = useQuery({
    queryKey: queryKeys.handicap(userId),
    queryFn: () => repository.getUserHandicap(userId),
  });
  return data?.handicap_index ?? null;
}
