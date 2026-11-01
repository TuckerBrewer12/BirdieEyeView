import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/data/queryKeys";
import { userRepository, type UserRepository, type UserUpdate } from "@/data/userRepository";

/**
 * Saves the home course and handicap. The shared user cache updates here, so
 * every screen that reads it gets the saved user.
 */
export function useUpdateUser(
  userId: string,
  repository: UserRepository = userRepository,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: UserUpdate) => {
      await repository.updateUser(userId, body);
      return repository.getUser(userId);
    },
    onSuccess: (refreshedUser) => {
      queryClient.setQueryData(queryKeys.user(userId), refreshedUser);
    },
  });
}
