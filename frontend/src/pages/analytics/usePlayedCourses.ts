import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/data/queryKeys";
import { analyticsRepository, type AnalyticsRepository } from "./analyticsRepository";

/** The courses the golfer has a round at. Saving a scan refetches it. */
export function usePlayedCourses(userId: string, repository: AnalyticsRepository = analyticsRepository) {
  return useQuery({
    queryKey: queryKeys.playedCourses(userId),
    queryFn: () => repository.getPlayedCourses(userId),
  });
}
