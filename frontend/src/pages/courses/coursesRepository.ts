import { api } from "@/lib/api";
import { userRepository } from "@/data/userRepository";
import { courseAnalyticsFrom, type CourseAnalytics } from "@/domain/courseAnalytics";
import { courseSummaryFrom, type CourseSummary } from "@/domain/course";
import type { CourseDto, HandicapIndexDto } from "@/types/api";

export interface CoursesRepository {
  getCourses(userId?: string, limit?: number, offset?: number): Promise<CourseSummary[]>;
  searchCourses(query: string, userId?: string, includeExternal?: boolean): Promise<CourseSummary[]>;
  getCourse(courseId: string): Promise<CourseDto>;
  getCourseAnalytics(userId: string, courseId: string): Promise<CourseAnalytics>;
  getUserHandicap(userId: string): Promise<HandicapIndexDto>;
}

export const coursesRepository: CoursesRepository = {
  getCourses: async (userId, limit, offset) => (await api.getCourses(userId, limit, offset)).map(courseSummaryFrom),
  searchCourses: async (query, userId, includeExternal) =>
    (await api.searchCourses(query, userId, includeExternal)).map(courseSummaryFrom),
  getCourse: (courseId) => api.getCourse(courseId),
  getCourseAnalytics: async (userId, courseId) => courseAnalyticsFrom(await api.getCourseAnalytics(userId, courseId)),
  getUserHandicap: (userId) => userRepository.getUserHandicap(userId),
};
