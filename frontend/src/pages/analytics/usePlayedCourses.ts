import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/data/queryKeys";
import { analyticsRepository, type AnalyticsRepository } from "./analyticsRepository";

export function usePlayedCourses(userId: string, repository: AnalyticsRepository = analyticsRepository) {
  return useQuery({
    queryKey: queryKeys.playedCourses(userId),
    queryFn: () => repository.getPlayedCourses(userId),
  });
}
