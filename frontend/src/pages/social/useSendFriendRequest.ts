import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/data/queryKeys";
import { withFriendship, type Friendship } from "@/data/friendsModel";
import { friendsRepository, type FriendsRepository } from "@/data/friendsRepository";

/**
 * Sends a friend request by friend code. The request the server returns goes
 * straight into the cached friendships, so the inbox's Sent tab has it
 * without a refetch.
 */
export function useSendFriendRequest(
  userId: string,
  repository: FriendsRepository = friendsRepository,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (friendCode: string) => repository.sendRequest(userId, friendCode),
    onSuccess: (sent) => {
      queryClient.setQueryData<Friendship[]>(queryKeys.friendships(userId), (prev) =>
        prev ? withFriendship(prev, sent) : prev,
      );
      queryClient.setQueryData<Friendship[]>(queryKeys.pendingFriendships(userId), (prev) =>
        prev ? withFriendship(prev, sent) : prev,
      );
    },
  });
}
