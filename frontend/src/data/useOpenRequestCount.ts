import { useQuery } from "@tanstack/react-query";
import { awaitsAnswer } from "./friendsModel";
import { queryKeys } from "./queryKeys";
import { friendsRepository, type FriendsRepository } from "./friendsRepository";

/**
 * How many friend requests wait on the golfer's answer, for the More menu. It reads only the
 * pending requests, never the friends list with each friend's figures, since every screen asks.
 */
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
