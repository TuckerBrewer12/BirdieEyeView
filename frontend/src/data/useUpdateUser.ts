import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { UserChangesDto } from "@/types/api";
import { courseRepository, type CourseRepository } from "./courseRepository";
import { queryKeys } from "./queryKeys";
import { courseQuery } from "./useCourse";
import { userRepository, type UserRepository } from "./userRepository";

/**
 * Saves changes to the golfer's profile: handicap, home course, scoring goal.
 *
 * The cached user takes the saved one, so every screen that reads it shows it at once. Figures
 * that start from the profile (the dashboard, goal report, analytics, and the course handicaps
 * and net scores on rounds and courses) refetch.
 * A newly picked home course loads before the mutation settles, so a caller that clears its form
 * on success never shows the course without its name in between.
 */
export function useUpdateUser(
  userId: string,
  repository: Pick<UserRepository, "updateUser"> = userRepository,
  courses: Pick<CourseRepository, "getCourse"> = courseRepository,
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (changes: UserChangesDto) => repository.updateUser(userId, changes),
    onSuccess: async (user, changes) => {
      queryClient.setQueryData(queryKeys.user(userId), user);
      for (const queryKey of [
        queryKeys.allRounds(),
        queryKeys.allCourses(),
        queryKeys.dashboard(userId),
        queryKeys.goalReport(userId),
        queryKeys.analytics(userId),
      ]) {
        void queryClient.invalidateQueries({ queryKey });
      }
      if (changes.home_course_id) await queryClient.prefetchQuery(courseQuery(changes.home_course_id, courses));
    },
  });
}
