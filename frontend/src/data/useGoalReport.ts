import { useQuery } from "@tanstack/react-query";
import { goalReportRepository, type GoalReportRepository } from "./goalReportRepository";
import { queryKeys } from "./queryKeys";

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
