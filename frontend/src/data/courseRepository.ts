import { api } from "@/lib/api";
import { courseSummaryFrom, type CourseSummary } from "@/domain/course";
import type { CourseDto } from "@/types/api";

/** The course reads every screen that picks or shows a course shares. */
export interface CourseRepository {
  /** A full course, with the figures the server works out for it. */
  getCourse(courseId: string): Promise<CourseDto>;
  /** Courses matching `query`; `includeExternal` adds the course provider's. */
  searchCourses(query: string, userId?: string, includeExternal?: boolean): Promise<CourseSummary[]>;
}

export type CourseSearchRepository = Pick<CourseRepository, "searchCourses">;

export const courseRepository: CourseRepository = {
  getCourse: (courseId) => api.getCourse(courseId),
  searchCourses: async (query, userId, includeExternal) =>
    (await api.searchCourses(query, userId, includeExternal)).map(courseSummaryFrom),
};
