import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/data/queryKeys";
import { friendsRepository, type FriendsRepository } from "./friendsRepository";

/** Every friendship the golfer is part of. Social and the inbox read the same list. */
export function useFriendships(userId: string, repository: FriendsRepository = friendsRepository) {
  return useQuery({
    queryKey: queryKeys.friendships(userId),
    queryFn: () => repository.getFriendships(userId),
  });
}
