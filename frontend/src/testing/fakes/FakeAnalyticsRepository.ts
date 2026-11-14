import { friendshipFromDto, type Friendship } from "../../data/friendsModel";
import type { AnalyticsFilters } from "../../domain/analyticsFilters";
import { benchmarkComparisonFrom, type BenchmarkComparison, type BenchmarkTarget } from "../../domain/benchmark";
import { playedCourseFrom, type AnalyticsRepository } from "../../pages/analytics/analyticsRepository";
import type { PlayedCourse } from "../../pages/analytics/model";
import type {
  AnalyticsDto,
  BenchmarkComparisonDto,
  GoalReportDto,
  PlayedCourseDto,
  UserChangesDto,
  UserDto,
} from "../../types/api";
import { analyticsForCourse } from "./analyticsResponses";
import { InMemoryFriendships, type InMemoryFriendshipsSeed } from "./InMemoryFriendships";

export interface FakeAnalyticsSeed {
  /** Every course's rounds. */
  analytics: AnalyticsDto;
  /** A course's own response, keyed by course id. A course not here answers with no rounds. */
  analyticsByCourse?: Record<string, AnalyticsDto>;
  /** The profile's last 20 rounds, when they differ from `analytics`. */
  profileAnalytics?: AnalyticsDto;
  playedCourses?: PlayedCourseDto[];
  user?: Partial<UserDto>;
  goalReport?: GoalReportDto | null;
  friends?: InMemoryFriendshipsSeed;
  /** The server's comparisons, keyed by {@link benchmarkKey}. One not here fails, as a 403 or 422 does. */
  benchmarks?: Record<string, BenchmarkComparisonDto>;
}

/** How a comparison is keyed in the seed: "handicap:5", "friend:user-avery". */
export function benchmarkKey(target: BenchmarkTarget): string {
  return target.against === "handicap" ? `handicap:${target.handicap}` : `friend:${target.friendId}`;
}

const DEFAULT_USER: UserDto = {
  id: "user-1",
  name: "Test Golfer",
  email: "test@example.com",
  friend_code: null,
  home_course_id: null,
  handicap: null,
  created_at: null,
  scoring_goal: null,
};

/** The analytics page's reads and its one write, answered from seeded responses as the server sends them. */
export class FakeAnalyticsRepository implements AnalyticsRepository {
  /** What each analytics load asked for, in order. */
  readonly requests: AnalyticsFilters[] = [];
  /** The comparisons asked for, keyed as the seed is, in order. */
  readonly benchmarkRequests: string[] = [];
  readonly updates: UserChangesDto[] = [];
  goalReportRequests = 0;
  readonly friendships: InMemoryFriendships;
  user: UserDto;
  goalReport: GoalReportDto | null;
  loadError: Error | null = null;
  saveError: Error | null = null;
  private readonly seed: FakeAnalyticsSeed;
  private held: Promise<void> | null = null;
  private release: (() => void) | null = null;
  private heldReport: Promise<void> | null = null;
  private releaseReport: (() => void) | null = null;
  private heldBenchmark: Promise<void> | null = null;
  private releaseBenchmark: (() => void) | null = null;

  constructor(seed: FakeAnalyticsSeed) {
    this.seed = seed;
    this.user = { ...DEFAULT_USER, ...seed.user };
    this.goalReport = seed.goalReport ?? null;
    this.friendships = new InMemoryFriendships(seed.friends ?? {});
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

  /** Goal report reads wait until `finishGoalReport()`. */
  holdGoalReport(): void {
    this.heldReport = new Promise((resolve) => {
      this.releaseReport = resolve;
    });
  }

  finishGoalReport(): void {
    this.releaseReport?.();
    this.heldReport = null;
  }

  /** Comparison reads wait until `finishBenchmark()`. */
  holdBenchmark(): void {
    this.heldBenchmark = new Promise((resolve) => {
      this.releaseBenchmark = resolve;
    });
  }

  finishBenchmark(): void {
    this.releaseBenchmark?.();
    this.heldBenchmark = null;
  }

  async getAnalytics(_userId: string, filters: AnalyticsFilters): Promise<AnalyticsDto> {
    this.requests.push(filters);
    if (this.held) await this.held;
    if (this.loadError) throw this.loadError;
    // The profile asks for the last 20 at every course.
    if (filters.limit === 20 && filters.courseId === "all" && this.seed.profileAnalytics) return this.seed.profileAnalytics;
    return analyticsForCourse(
      {
        analytics: this.seed.analytics,
        byCourse: this.seed.analyticsByCourse,
        homeCourseId: this.user.home_course_id,
      },
      filters.courseId,
    );
  }

  async getPlayedCourses(): Promise<PlayedCourse[]> {
    return (this.seed.playedCourses ?? []).map(playedCourseFrom);
  }

  async getUser(): Promise<UserDto> {
    return this.user;
  }

  async updateUser(_userId: string, changes: UserChangesDto): Promise<UserDto> {
    this.updates.push(changes);
    if (this.saveError) throw this.saveError;
    if (changes.scoring_goal !== undefined) this.user = { ...this.user, scoring_goal: changes.scoring_goal };
    return this.user;
  }

  /** The seeded report, for whatever goal the golfer has saved, as the server reads it. */
  async getGoalReport(): Promise<GoalReportDto> {
    this.goalReportRequests += 1;
    const goal = this.user.scoring_goal;
    if (this.heldReport) await this.heldReport;
    if (!this.goalReport) throw new Error("No goal report.");
    return { ...this.goalReport, scoring_goal: goal ?? this.goalReport.scoring_goal };
  }

  async getBenchmarkComparison(_userId: string, target: BenchmarkTarget): Promise<BenchmarkComparison> {
    const key = benchmarkKey(target);
    this.benchmarkRequests.push(key);
    if (this.heldBenchmark) await this.heldBenchmark;
    const found = this.seed.benchmarks?.[key];
    if (!found) throw new Error("No benchmark to compare with.");
    return benchmarkComparisonFrom(found);
  }

  async getFriendships(userId: string): Promise<Friendship[]> {
    return this.friendships.list().map((dto) => friendshipFromDto(dto, userId));
  }
}
