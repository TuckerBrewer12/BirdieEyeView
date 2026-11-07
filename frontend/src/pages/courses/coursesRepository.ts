import { api } from "@/lib/api";
import { courseRepository, type CourseRepository } from "@/data/courseRepository";
import { courseAnalyticsFrom, type CourseAnalytics } from "@/domain/courseAnalytics";
import { courseSummaryFrom, type CourseSummary } from "@/domain/course";

/** The shared course reads (`data/courseRepository`), plus what only the courses pages ask for. */
export interface CoursesRepository extends CourseRepository {
  getCourses(userId?: string, limit?: number, offset?: number): Promise<CourseSummary[]>;
  getCourseAnalytics(userId: string, courseId: string): Promise<CourseAnalytics>;
}

export const coursesRepository: CoursesRepository = {
  ...courseRepository,
  getCourses: async (userId, limit, offset) => (await api.getCourses(userId, limit, offset)).map(courseSummaryFrom),
  getCourseAnalytics: async (userId, courseId) => courseAnalyticsFrom(await api.getCourseAnalytics(userId, courseId)),
};
