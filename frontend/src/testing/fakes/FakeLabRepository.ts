import { friendshipFromDto, type Friendship } from "../../data/friendsModel";
import type { LabRepository } from "../../pages/the-lab/labRepository";
import type { AnalyticsFilters } from "../../domain/analyticsFilters";
import {
  benchmarkComparisonFrom,
  type BenchmarkComparison,
  type BenchmarkTarget,
} from "../../domain/benchmark";
import type {
  AnalyticsDto,
  BenchmarkComparisonDto,
  GoalReportDto,
  UserChangesDto,
  UserDto,
} from "../../types/api";
import { labUser } from "../fixtures/lab";
import { InMemoryFriendships, type InMemoryFriendshipsSeed } from "./InMemoryFriendships";

export interface FakeLabSeed {
  user?: Partial<UserDto>;
  analytics?: Record<string, AnalyticsDto>;
  goalReport?: GoalReportDto | null;
  friends?: InMemoryFriendshipsSeed;
  benchmarks?: Record<string, BenchmarkComparisonDto>;
}

export function benchmarkKey(target: BenchmarkTarget): string {
  if (target.against === "handicap") return `handicap:${target.handicap}`;
  if (target.against === "friend") return `friend:${target.friendId}`;
  return "peak";
}

export class FakeLabRepository implements LabRepository {
  user: UserDto;
  readonly analytics: Partial<Record<string, AnalyticsDto>>;
  goalReport: GoalReportDto | null;
  readonly friendships: InMemoryFriendships;
  readonly benchmarks: Partial<Record<string, BenchmarkComparisonDto>>;
  readonly benchmarkRequests: string[] = [];
  readonly analyticsRequests: string[] = [];
  readonly analyticsFilters: AnalyticsFilters[] = [];
  readonly updates: UserChangesDto[] = [];
  goalReportRequests = 0;
  saveError: Error | null = null;
  private held: Promise<void> | null = null;
  private release: (() => void) | null = null;
  private heldReport: Promise<void> | null = null;
  private releaseReport: (() => void) | null = null;
  private heldBenchmark: Promise<void> | null = null;
  private releaseBenchmark: (() => void) | null = null;

  constructor({ user = {}, analytics = {}, goalReport = null, friends = {}, benchmarks = {} }: FakeLabSeed = {}) {
    this.benchmarks = benchmarks;
    this.user = { ...labUser, ...user };
    this.analytics = analytics;
    this.goalReport = goalReport;
    this.friendships = new InMemoryFriendships(friends);
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

  holdGoalReport(): void {
    this.heldReport = new Promise((resolve) => {
      this.releaseReport = resolve;
    });
  }

  finishGoalReport(): void {
    this.releaseReport?.();
    this.heldReport = null;
  }

  holdAnalytics(): void {
    this.held = new Promise((resolve) => {
      this.release = resolve;
    });
  }

  finishAnalytics(): void {
    this.release?.();
    this.held = null;
  }

  async getAnalytics(userId: string, filters: AnalyticsFilters): Promise<AnalyticsDto> {
    this.analyticsRequests.push(userId);
    this.analyticsFilters.push(filters);
    if (this.held) await this.held;
    const found = this.analytics[userId];
    if (!found) throw new Error("Analytics failed to load.");
    return found;
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

  async getBenchmarkComparison(_userId: string, target: BenchmarkTarget): Promise<BenchmarkComparison> {
    const key = benchmarkKey(target);
    this.benchmarkRequests.push(key);
    if (this.heldBenchmark) await this.heldBenchmark;
    const found = this.benchmarks[key];
    if (!found) throw new Error("No benchmark to compare with.");
    return benchmarkComparisonFrom(found);
  }

  async getFriendships(userId: string): Promise<Friendship[]> {
    return this.friendships.list().map((dto) => friendshipFromDto(dto, userId));
  }
}
