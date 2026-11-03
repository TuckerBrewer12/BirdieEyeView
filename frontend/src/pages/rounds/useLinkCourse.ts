import { useMutation, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/data/queryKeys";
import type { RoundSummary } from "@/domain";
import { roundsRepository, type RoundsRepository } from "./roundsRepository";

export interface LinkCourseVariables {
  roundId: string;
  courseId: string;
}

export function useLinkCourse(
  userId: string,
  repository: RoundsRepository = roundsRepository,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ roundId, courseId }: LinkCourseVariables) =>
      repository.linkCourse(roundId, courseId),
    onSuccess: (updated) => {
      queryClient.setQueryData<RoundSummary[]>(queryKeys.rounds(userId), (prev) =>
        prev?.map((r) => (r.id === updated.id ? updated : r)),
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.round(updated.id) });
    },
  });
}
