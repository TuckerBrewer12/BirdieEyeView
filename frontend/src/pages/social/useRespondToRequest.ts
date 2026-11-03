import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/data/queryKeys";
import { withFriendship, type Friendship, type FriendshipAnswer } from "@/data/friendsModel";
import { friendsRepository, type FriendsRepository } from "@/data/friendsRepository";

export interface RespondVariables {
  friendshipId: string;
  answer: FriendshipAnswer;
}

export function useRespondToRequest(
  userId: string,
  repository: FriendsRepository = friendsRepository,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ friendshipId, answer }: RespondVariables) =>
      repository.respond(userId, friendshipId, answer),
    onSuccess: (answered) => {
      queryClient.setQueryData<Friendship[]>(queryKeys.friendships(userId), (prev) =>
        prev ? withFriendship(prev, answered) : prev,
      );
    },
  });
}
