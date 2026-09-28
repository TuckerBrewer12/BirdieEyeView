import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/data/queryKeys";
import type { Round } from "@/domain";
import { roundsRepository, type RoundsRepository } from "./roundsRepository";

export interface LinkCourseVariables {
  roundId: string;
  courseId: string;
}

/**
 * Links a round to a saved course. The cache updates live here, so every
 * caller gets them: the rounds list swaps in the updated round, and any cached
 * detail for that round refetches.
 */
export function useLinkCourse(
  userId: string,
  repository: RoundsRepository = roundsRepository,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roundId, courseId }: LinkCourseVariables) =>
      repository.linkCourse(roundId, courseId),
    onSuccess: (updated) => {
      queryClient.setQueryData<Round[]>(queryKeys.rounds(userId), (prev) =>
        prev?.map((r) => (r.id === updated.id ? updated : r)),
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.round(updated.id) });
    },
  });
}
