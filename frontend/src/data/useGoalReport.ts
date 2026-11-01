import { useQuery } from "@tanstack/react-query";
import { goalReportRepository, type GoalReportRepository } from "./goalReportRepository";
import { queryKeys } from "./queryKeys";

/**
 * The server's report on the golfer's scoring goal over their last 20 rounds. The dashboard's
 * goal card and The Lab share this one query. It waits until a goal is set, since the server
 * has nothing to report without one; `useUpdateUser` refetches it when the goal changes.
 */
export function useGoalReport(
  userId: string,
  scoringGoal: number | null | undefined,
  repository: GoalReportRepository = goalReportRepository,
) {
  return useQuery({
    queryKey: queryKeys.goalReport(userId),
    queryFn: () => repository.getGoalReport(userId, 20),
    enabled: scoringGoal != null,
    retry: false,
  });
}
