import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/data/queryKeys";
import { withFriendship, type Friendship, type FriendshipAnswer } from "@/data/friendsModel";
import { friendsRepository, type FriendsRepository } from "@/data/friendsRepository";

export interface RespondVariables {
  friendshipId: string;
  answer: FriendshipAnswer;
}

/**
 * Accepts, declines or blocks a request the golfer received. The answered
 * friendship replaces its cached copy, which Profile reads too, so an
 * accepted request is a friend to compare against straight away.
 */
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
      // An answered request is no longer pending, so the More menu's count drops with it.
      queryClient.setQueryData<Friendship[]>(queryKeys.pendingFriendships(userId), (prev) =>
        prev?.filter((f) => f.id !== answered.id),
      );
    },
  });
}
