import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/data/queryKeys";
import { coursesRepository, type CoursesRepository } from "./coursesRepository";

export function useCourseAnalytics(
  userId: string,
  courseId: string | undefined,
  repository: CoursesRepository = coursesRepository,
) {
  return useQuery({
    queryKey: queryKeys.courseAnalytics(userId, courseId),
    queryFn: () => repository.getCourseAnalytics(userId, courseId!),
    enabled: !!courseId,
  });
}
