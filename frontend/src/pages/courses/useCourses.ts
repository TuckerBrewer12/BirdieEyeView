import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/data/queryKeys";
import { coursesRepository, type CoursesRepository } from "./coursesRepository";

/** The golfer's courses, or the ones matching `search` when there is one. */
export function useCourses(userId: string, search: string, repository: CoursesRepository = coursesRepository) {
  return useQuery({
    queryKey: queryKeys.courses(userId, search),
    queryFn: () => (search ? repository.searchCourses(search, userId) : repository.getCourses(userId)),
  });
}
