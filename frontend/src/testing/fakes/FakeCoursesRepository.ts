import { courseAnalyticsFrom, type CourseAnalytics } from "../../domain/courseAnalytics";
import { courseSummaryFrom, type CourseSummary } from "../../domain/course";
import type { CourseAnalyticsDto, CourseDto, CourseSummaryDto } from "../../types/api";
import type { CoursesRepository } from "../../pages/courses/coursesRepository";
import { emptyCourseAnalytics } from "../fixtures/courseAnalytics";
import { courseResponse } from "./courseResponses";

export class FakeCoursesRepository implements CoursesRepository {
  readonly getCoursesCalls: string[] = [];
  readonly searchQueries: string[] = [];
  courses: CourseSummaryDto[];
  fullCourses: CourseDto[] = [];
  analytics: CourseAnalyticsDto | null = null;
  error: Error | null = null;
  courseError: Error | null = null;
  analyticsError: Error | null = null;

  constructor(courses: CourseSummaryDto[] = []) {
    this.courses = [...courses];
  }

  async getCourses(userId?: string): Promise<CourseSummary[]> {
    this.getCoursesCalls.push(userId ?? "");
    if (this.error) throw this.error;
    return this.courses.map(courseSummaryFrom);
  }

  async searchCourses(query: string): Promise<CourseSummary[]> {
    this.searchQueries.push(query);
    if (this.error) throw this.error;
    const needle = query.toLowerCase();
    return this.courses
      .filter((course) =>
        course.name?.toLowerCase().includes(needle)
        || course.location?.toLowerCase().includes(needle),
      )
      .map(courseSummaryFrom);
  }

  async searchCourseList(query: string): Promise<CourseSummary[]> {
    return this.searchCourses(query);
  }

  async getCourse(courseId: string): Promise<CourseDto> {
    if (this.courseError) throw this.courseError;
    const full = this.fullCourses.find((course) => course.id === courseId);
    if (full) return full;
    const summary = this.courses.find((course) => course.id === courseId);
    if (summary) {
      return courseResponse({
        id: summary.id,
        name: summary.name,
        location: summary.location,
        par: summary.par,
        holes: [],
        tees: [],
      });
    }
    throw new Error("Course not found.");
  }

  async getCourseAnalytics(_userId: string, courseId: string): Promise<CourseAnalytics> {
    if (this.analyticsError) throw this.analyticsError;
    return courseAnalyticsFrom(this.analytics ?? emptyCourseAnalytics(courseId));
  }
}
