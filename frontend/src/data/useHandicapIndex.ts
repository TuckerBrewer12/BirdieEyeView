import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";
import { userRepository, type UserRepository } from "./userRepository";

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
