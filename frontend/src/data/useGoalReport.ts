import { useQuery } from "@tanstack/react-query";
import { goalReportRepository, type GoalReportRepository } from "./goalReportRepository";
import { queryKeys } from "./queryKeys";

/**
 * The server's report on the golfer's scoring goal over their last 20 rounds. The dashboard's
 * goal card and Profile share this one query. It waits until a goal is set, since the server
 * has nothing to report without one. Each goal has its own entry, so a newly picked goal
 * shows no figures until its own report loads, never the last goal's; `useUpdateUser`
 * refetches them when the goal changes.
 */
export function useGoalReport(
  userId: string,
  scoringGoal: number | null | undefined,
  repository: GoalReportRepository = goalReportRepository,
) {
  return useQuery({
    queryKey: queryKeys.goalReport(userId, scoringGoal ?? undefined),
    queryFn: () => repository.getGoalReport(userId, 20),
    enabled: scoringGoal != null,
    retry: false,
  });
}
