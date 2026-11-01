import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/data/queryKeys";
import { withFriendship, type Friendship, type FriendshipAnswer } from "./friendsModel";
import { friendsRepository, type FriendsRepository } from "./friendsRepository";

export interface RespondVariables {
  friendshipId: string;
  answer: FriendshipAnswer;
}

/**
 * Accepts, declines or blocks a request the golfer received. The answered
 * friendship replaces its cached copy, and the Lab's friend list refetches,
 * since an accepted request is a new friend to compare against.
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
      void queryClient.invalidateQueries({ queryKey: queryKeys.friendshipsAccepted });
    },
  });
}
