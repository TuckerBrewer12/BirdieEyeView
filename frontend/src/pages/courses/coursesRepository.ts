import { api } from "@/lib/api";
import { userRepository } from "@/data/userRepository";
import type { Course, CourseSummary } from "@/types/golf";
import type { CourseAnalyticsData } from "@/types/analytics";

export interface CoursesRepository {
  getCourses(userId?: string, limit?: number, offset?: number): Promise<CourseSummary[]>;
  searchCourses(query: string, userId?: string, includeExternal?: boolean): Promise<CourseSummary[]>;
  getCourse(courseId: string): Promise<Course>;
  getCourseAnalytics(userId: string, courseId: string): Promise<CourseAnalyticsData>;
  getUserHandicap(userId: string): Promise<{ handicap_index: number | null }>;
}

export const coursesRepository: CoursesRepository = {
  getCourses: (userId, limit, offset) => api.getCourses(userId, limit, offset),
  searchCourses: (query, userId, includeExternal) => api.searchCourses(query, userId, includeExternal),
  getCourse: (courseId) => api.getCourse(courseId),
  getCourseAnalytics: (userId, courseId) => api.getCourseAnalytics(userId, courseId),
  getUserHandicap: (userId) => userRepository.getUserHandicap(userId),
};
