import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/data/queryKeys";
import { withFriendship, type Friendship } from "@/data/friendsModel";
import { friendsRepository, type FriendsRepository } from "@/data/friendsRepository";

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
    },
  });
}
