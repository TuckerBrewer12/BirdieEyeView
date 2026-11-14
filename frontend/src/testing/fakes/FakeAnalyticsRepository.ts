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
  analytics: AnalyticsDto;
  analyticsByCourse?: Record<string, AnalyticsDto>;
  profileAnalytics?: AnalyticsDto;
  playedCourses?: PlayedCourseDto[];
  user?: Partial<UserDto>;
  goalReport?: GoalReportDto | null;
  friends?: InMemoryFriendshipsSeed;
  benchmarks?: Record<string, BenchmarkComparisonDto>;
}

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

export class FakeAnalyticsRepository implements AnalyticsRepository {
  readonly requests: AnalyticsFilters[] = [];
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

  hold(): void {
    this.held = new Promise((resolve) => {
      this.release = resolve;
    });
  }

  finish(): void {
    this.release?.();
    this.held = null;
  }

  holdGoalReport(): void {
    this.heldReport = new Promise((resolve) => {
      this.releaseReport = resolve;
    });
  }

  finishGoalReport(): void {
    this.releaseReport?.();
    this.heldReport = null;
  }

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
