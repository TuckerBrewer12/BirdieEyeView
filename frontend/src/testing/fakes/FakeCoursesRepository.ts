import type { CourseSummary } from "../../types/golf";
import type { CoursesRepository } from "../../pages/courses/coursesRepository";

export class FakeCoursesRepository implements CoursesRepository {
  readonly getCoursesCalls: string[] = [];
  readonly searchQueries: string[] = [];
  courses: CourseSummary[];
  error: Error | null = null;

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
}
