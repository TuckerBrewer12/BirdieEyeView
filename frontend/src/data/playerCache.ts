import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { queryKeys } from "./queryKeys";

function fromRounds(userId: string): QueryKey[] {
  return [
    queryKeys.rounds(userId),
    queryKeys.allRounds(),
    queryKeys.allRoundComparisons(userId),
    queryKeys.dashboard(userId),
    queryKeys.analytics(userId),
    queryKeys.goalReport(userId),
    queryKeys.playedCourses(userId),
    queryKeys.allCourseLists(userId),
    queryKeys.allCourseAnalytics(userId),
    queryKeys.allCourses(),
  ];
}

function fromUser(userId: string): QueryKey[] {
  return [
    queryKeys.settings(userId),
    queryKeys.allRounds(),
    queryKeys.allCourses(),
    queryKeys.dashboard(userId),
    queryKeys.goalReport(userId),
    queryKeys.analytics(userId),
  ];
}

async function markStale(queryClient: QueryClient, keys: QueryKey[]): Promise<void> {
  await Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey })));
}

export function roundsChanged(queryClient: QueryClient, userId: string): Promise<void> {
  return markStale(queryClient, fromRounds(userId));
}

export function userChanged(queryClient: QueryClient, userId: string): Promise<void> {
  return markStale(queryClient, fromUser(userId));
}
