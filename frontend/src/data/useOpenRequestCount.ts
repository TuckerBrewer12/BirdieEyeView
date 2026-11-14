import { useQuery } from "@tanstack/react-query";
import { awaitsAnswer } from "./friendsModel";
import { queryKeys } from "./queryKeys";
import { friendsRepository, type FriendsRepository } from "./friendsRepository";

export function useOpenRequestCount(
  userId: string,
  repository: Pick<FriendsRepository, "getPendingFriendships"> = friendsRepository,
) {
  return useQuery({
    queryKey: queryKeys.pendingFriendships(userId),
    queryFn: () => repository.getPendingFriendships(userId),
    enabled: userId !== "",
    select: (pending) => pending.filter(awaitsAnswer).length,
  });
}
