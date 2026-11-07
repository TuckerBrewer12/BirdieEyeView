import { useCallback } from "react";
import { queryOptions, useQuery, useQueryClient } from "@tanstack/react-query";
import { courseRepository, type CourseRepository } from "./courseRepository";
import { queryKeys } from "./queryKeys";

type CourseReader = Pick<CourseRepository, "getCourse">;

/** The one query for a full course. `useCourse`, `useFetchCourse` and `useUpdateUser` all read it. */
export function courseQuery(courseId: string | undefined, repository: CourseReader = courseRepository) {
  return queryOptions({
    queryKey: queryKeys.course(courseId),
    queryFn: () => repository.getCourse(courseId!),
    enabled: !!courseId,
  });
}

/** A full course, with the figures the server works out for it. Waits while `courseId` is unset. */
export function useCourse(courseId: string | undefined, repository: CourseReader = courseRepository) {
  return useQuery(courseQuery(courseId, repository));
}

/** Loads a course into the entry `useCourse` reads, for a pick that needs the course at once. */
export function useFetchCourse(repository: CourseReader = courseRepository) {
  const queryClient = useQueryClient();
  return useCallback(
    (courseId: string) => queryClient.fetchQuery(courseQuery(courseId, repository)),
    [queryClient, repository],
  );
}
