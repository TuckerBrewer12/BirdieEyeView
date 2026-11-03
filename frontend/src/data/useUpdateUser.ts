import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UserChangesDto } from "@/types/api";
import { queryKeys } from "./queryKeys";
import { userRepository, type UserRepository } from "./userRepository";

/**
 * Saves changes to the golfer's profile: handicap, home course, scoring goal.
 *
 * The cached user takes the saved one, so the dashboard and The Lab show it at once. Figures
 * that start from the profile (the dashboard, goal report, analytics, and the course handicaps
 * and net scores on rounds and courses) refetch.
 * The mutation stays pending until Settings has refetched, so a caller that clears its form on
 * success never shows the old values in between.
 */
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
        queryKeys.allRounds(),
        queryKeys.allCourses(),
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
