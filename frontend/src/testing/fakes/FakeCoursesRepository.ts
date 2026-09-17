import type { Course, CourseSummary } from "../../types/golf";
import type { CourseAnalyticsData } from "../../types/analytics";
import type { CoursesRepository } from "../../pages/courses/coursesRepository";
import { emptyCourseAnalytics } from "../fixtures/courseAnalytics";

export class FakeCoursesRepository implements CoursesRepository {
  readonly getCoursesCalls: string[] = [];
  readonly searchQueries: string[] = [];
  courses: CourseSummary[];
  fullCourses: Course[] = [];
  analytics: CourseAnalyticsData | null = null;
  handicapIndex: number | null = null;
  error: Error | null = null;
  courseError: Error | null = null;

  constructor(courses: CourseSummary[] = []) {
    this.courses = [...courses];
  }

  async getCourses(userId?: string): Promise<CourseSummary[]> {
    this.getCoursesCalls.push(userId ?? "");
    if (this.error) throw this.error;
    return this.courses;
  }

  async searchCourses(query: string): Promise<CourseSummary[]> {
    this.searchQueries.push(query);
    if (this.error) throw this.error;
    const needle = query.toLowerCase();
    return this.courses.filter((course) =>
      course.name?.toLowerCase().includes(needle)
      || course.location?.toLowerCase().includes(needle),
    );
  }

  async getCourse(courseId: string): Promise<Course> {
    if (this.courseError) throw this.courseError;
    const full = this.fullCourses.find((course) => course.id === courseId);
    if (full) return full;
    const summary = this.courses.find((course) => course.id === courseId);
    if (summary) {
      return {
        id: summary.id,
        name: summary.name,
        location: summary.location,
        par: summary.par,
        holes: [],
        tees: [],
      };
    }
    throw new Error("Course not found.");
  }

  async getCourseAnalytics(_userId: string, courseId: string): Promise<CourseAnalyticsData> {
    return this.analytics ?? emptyCourseAnalytics(courseId);
  }

  async getUserHandicap(): Promise<{ handicap_index: number | null }> {
    return { handicap_index: this.handicapIndex };
  }
}
