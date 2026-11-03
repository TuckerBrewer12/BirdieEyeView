import type { AnalyticsDto, PlayedCourseDto, RoundDto, UserDto } from "../../types/api";
import { Round, type RoundDetail } from "../../domain";
import type { AnalyticsFilters, PlayedCourse } from "../../pages/analytics/model";
import { playedCourseFrom, type AnalyticsRepository } from "../../pages/analytics/analyticsRepository";
import { analyticsForCourse } from "./analyticsResponses";

export interface FakeAnalyticsSeed {
  analytics: AnalyticsDto;
  analyticsByCourse?: Record<string, AnalyticsDto>;
  playedCourses?: PlayedCourseDto[];
  user?: UserDto;
  detailRounds?: RoundDto[];
}

export class FakeAnalyticsRepository implements AnalyticsRepository {
  readonly requests: AnalyticsFilters[] = [];
  loadError: Error | null = null;
  private readonly seed: FakeAnalyticsSeed;
  private held: Promise<void> | null = null;
  private release: (() => void) | null = null;

  constructor(seed: FakeAnalyticsSeed) {
    this.seed = seed;
  }

  hold(): void {
    this.held = new Promise((resolve) => {
      this.release = resolve;
    });
  }

  finish(): void {
    this.release?.();
    this.held = null;
  }

  async getAnalytics(_userId: string, filters: AnalyticsFilters): Promise<AnalyticsDto> {
    this.requests.push(filters);
    if (this.held) await this.held;
    if (this.loadError) throw this.loadError;
    return analyticsForCourse(
      {
        analytics: this.seed.analytics,
        byCourse: this.seed.analyticsByCourse,
        homeCourseId: this.seed.user?.home_course_id,
      },
      filters.courseId,
    );
  }

  async getPlayedCourses(): Promise<PlayedCourse[]> {
    return (this.seed.playedCourses ?? []).map(playedCourseFrom);
  }

  async getRound(roundId: string): Promise<RoundDetail> {
    const round = this.seed.detailRounds?.find((candidate) => candidate.id === roundId);
    if (!round) throw new Error("Round not found.");
    return Round.detailFromDto(round);
  }

  async getUser(userId: string): Promise<UserDto> {
    return (
      this.seed.user ?? {
        id: userId,
        name: "Test Golfer",
        email: "test@example.com",
        friend_code: null,
        home_course_id: null,
        handicap: null,
        created_at: null,
        scoring_goal: null,
      }
    );
  }
}
