import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "@/data/queryKeys";
import { coursesRepository, type CoursesRepository } from "./coursesRepository";

export function useCourse(courseId: string | undefined, repository: CoursesRepository = coursesRepository) {
  return useQuery({
    queryKey: queryKeys.course(courseId),
    queryFn: () => repository.getCourse(courseId!),
    enabled: !!courseId,
  });
}
