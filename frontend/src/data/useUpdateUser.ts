import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UserChangesDto } from "@/types/api";
import { userChanged } from "./playerCache";
import { queryKeys } from "./queryKeys";
import { userRepository, type UserRepository } from "./userRepository";

export function useUpdateUser(
  userId: string,
  repository: Pick<UserRepository, "updateUser"> = userRepository,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (changes: UserChangesDto) => repository.updateUser(userId, changes),
    onSuccess: async (user) => {
      queryClient.setQueryData(queryKeys.user(userId), user);
      await userChanged(queryClient, userId);
    },
  });
}
