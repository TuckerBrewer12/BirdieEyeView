import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";
import { friendsRepository, type FriendsRepository } from "./friendsRepository";

export function useFriendships(
  userId: string,
  repository: Pick<FriendsRepository, "getFriendships"> = friendsRepository,
) {
  return useQuery({
    queryKey: queryKeys.friendships(userId),
    queryFn: () => repository.getFriendships(userId),
  });
}
