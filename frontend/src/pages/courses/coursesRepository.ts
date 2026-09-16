import { api } from "@/lib/api";
import type { CourseSummary } from "@/types/golf";

export interface CoursesRepository {
  getCourses(userId?: string, limit?: number, offset?: number): Promise<CourseSummary[]>;
  searchCourses(query: string, userId?: string, includeExternal?: boolean): Promise<CourseSummary[]>;
}

export const coursesRepository: CoursesRepository = {
  getCourses: (userId, limit, offset) => api.getCourses(userId, limit, offset),
  searchCourses: (query, userId, includeExternal) => api.searchCourses(query, userId, includeExternal),
};
