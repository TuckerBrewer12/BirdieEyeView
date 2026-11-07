import type { DevicePreferences } from "../../pages/settings/model";
import type { SettingsRepository } from "../../pages/settings/settingsRepository";
import { courseSummaryFrom, type CourseSummary } from "../../domain/course";
import type { CourseDto, CourseSummaryDto, UserChangesDto, UserDto } from "../../types/api";
import { courseResponse } from "./courseResponses";

export interface FakeSettingsSeed {
  user?: Partial<UserDto>;
  courses?: CourseSummaryDto[];
  device?: Partial<DevicePreferences>;
}

/** One player's settings in memory: their user row, the courses to search and read, and device choices. */
export class FakeSettingsRepository implements SettingsRepository {
  user: UserDto;
  courses: CourseSummaryDto[];
  device: DevicePreferences;
  readonly updates: UserChangesDto[] = [];
  readonly searchQueries: string[] = [];
  loadError: Error | null = null;
  saveError: Error | null = null;

  constructor({ user = {}, courses = [], device = {} }: FakeSettingsSeed = {}) {
    this.user = {
      id: "user-1",
      friend_code: "BIRD-1234",
      name: "Test Golfer",
      email: "test@example.com",
      home_course_id: null,
      handicap: null,
      created_at: null,
      scoring_goal: null,
      ...user,
    };
    this.courses = [...courses];
    this.device = { getUpdates: true, ...device };
  }

  async getUser(): Promise<UserDto> {
    if (this.loadError) throw this.loadError;
    return this.user;
  }

  async getCourse(courseId: string): Promise<CourseDto> {
    const course = this.courses.find((candidate) => candidate.id === courseId);
    if (!course) throw new Error("Course not found.");
    return courseResponse({
      id: course.id,
      name: course.name,
      location: course.location,
      par: course.par,
      holes: [],
      tees: [],
    });
  }

  async updateUser(_userId: string, changes: UserChangesDto): Promise<UserDto> {
    this.updates.push(changes);
    if (this.saveError) throw this.saveError;
    this.user = {
      ...this.user,
      ...(changes.handicap !== undefined ? { handicap: changes.handicap } : {}),
      ...(changes.home_course_id !== undefined ? { home_course_id: changes.home_course_id } : {}),
      ...(changes.scoring_goal !== undefined ? { scoring_goal: changes.scoring_goal } : {}),
    };
    return this.user;
  }

  async searchCourses(query: string): Promise<CourseSummary[]> {
    this.searchQueries.push(query);
    const needle = query.toLowerCase();
    return this.courses.filter((course) => course.name?.toLowerCase().includes(needle)).map(courseSummaryFrom);
  }

  readDevicePreferences(): DevicePreferences {
    return { ...this.device };
  }

  saveDevicePreferences(preferences: DevicePreferences): void {
    this.device = { ...preferences };
  }
}
