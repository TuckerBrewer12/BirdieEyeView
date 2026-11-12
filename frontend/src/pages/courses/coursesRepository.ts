import { api } from "@/lib/api";
import { courseAnalyticsFrom, type CourseAnalytics } from "@/domain/courseAnalytics";
import { courseSummaryFrom, type CourseSummary } from "@/domain/course";
import type { CourseDto } from "@/types/api";

export interface CoursesRepository {
  getCourses(userId?: string, limit?: number, offset?: number): Promise<CourseSummary[]>;
  searchCourses(query: string, userId?: string, includeExternal?: boolean): Promise<CourseSummary[]>;
  /** The course list's search: each course carries the golfer's record there, as the list does. */
  searchCourseList(query: string, userId: string): Promise<CourseSummary[]>;
  getCourse(courseId: string): Promise<CourseDto>;
  getCourseAnalytics(userId: string, courseId: string): Promise<CourseAnalytics>;
}

export const coursesRepository: CoursesRepository = {
  getCourses: async (userId, limit, offset) => (await api.getCourses(userId, limit, offset)).map(courseSummaryFrom),
  searchCourses: async (query, userId, includeExternal) =>
    (await api.searchCourses(query, userId, includeExternal)).map(courseSummaryFrom),
  searchCourseList: async (query, userId) =>
    (await api.searchCourses(query, userId, false, true)).map(courseSummaryFrom),
  getCourse: (courseId) => api.getCourse(courseId),
  getCourseAnalytics: async (userId, courseId) => courseAnalyticsFrom(await api.getCourseAnalytics(userId, courseId)),
};
