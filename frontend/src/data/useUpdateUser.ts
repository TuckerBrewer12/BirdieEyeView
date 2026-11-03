import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UserChangesDto } from "@/types/api";
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
      for (const queryKey of [
        queryKeys.handicap(userId),
        queryKeys.dashboard(userId),
        queryKeys.goalReport(userId),
        queryKeys.analytics(userId),
      ]) {
        void queryClient.invalidateQueries({ queryKey });
      }
      await queryClient.invalidateQueries({ queryKey: queryKeys.settings(userId) });
    },
  });
}
