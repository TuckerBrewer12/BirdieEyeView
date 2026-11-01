import type { AnalyticsDto, PlayedCourseDto, RoundDto } from "../../types/api";
import { Round, type RoundDetail } from "../../domain";
import type { User } from "../../types/golf";
import { analyticsFrom, type Analytics, type AnalyticsFilters, type PlayedCourse } from "../../pages/analytics/model";
import { playedCourseFrom, type AnalyticsRepository } from "../../pages/analytics/analyticsRepository";
import { analyticsForCourse } from "./analyticsResponses";

export interface FakeAnalyticsSeed {
  /** Every course's rounds. */
  analytics: AnalyticsDto;
  /** A course's own response, keyed by course id. A course not here answers with no rounds. */
  analyticsByCourse?: Record<string, AnalyticsDto>;
  playedCourses?: PlayedCourseDto[];
  user?: User;
  /** Rounds in full, for the best round's card. A round not here fails to load. */
  detailRounds?: RoundDto[];
}

/** Answers from seeded responses, mapped the way the real repository maps the server's. */
export class FakeAnalyticsRepository implements AnalyticsRepository {
  /** What each analytics load asked for, in order. */
  readonly requests: AnalyticsFilters[] = [];
  loadError: Error | null = null;
  private readonly seed: FakeAnalyticsSeed;
  private held: Promise<void> | null = null;
  private release: (() => void) | null = null;

  constructor(seed: FakeAnalyticsSeed) {
    this.seed = seed;
  }

  /** Analytics loads wait until `finish()`, so a load in flight can be seen. */
  hold(): void {
    this.held = new Promise((resolve) => {
      this.release = resolve;
    });
  }

  finish(): void {
    this.release?.();
    this.held = null;
  }

  async getAnalytics(_userId: string, filters: AnalyticsFilters): Promise<Analytics> {
    this.requests.push(filters);
    if (this.held) await this.held;
    if (this.loadError) throw this.loadError;
    const response = analyticsForCourse(
      {
        analytics: this.seed.analytics,
        byCourse: this.seed.analyticsByCourse,
        homeCourseId: this.seed.user?.home_course_id,
      },
      filters.courseId,
    );
    return analyticsFrom(response);
  }

  async getPlayedCourses(): Promise<PlayedCourse[]> {
    return (this.seed.playedCourses ?? []).map(playedCourseFrom);
  }

  async getRound(roundId: string): Promise<RoundDetail> {
    const round = this.seed.detailRounds?.find((candidate) => candidate.id === roundId);
    if (!round) throw new Error("Round not found.");
    return Round.detailFromDto(round);
  }

  async getUser(userId: string): Promise<User> {
    return (
      this.seed.user ?? {
        id: userId,
        name: "Test Golfer",
        email: "test@example.com",
        home_course_id: null,
        handicap: null,
        created_at: null,
        scoring_goal: null,
      }
    );
  }
}
