import { friendshipFromDto, type Friendship } from "../../data/friendsModel";
import type { LabRepository } from "../../pages/the-lab/labRepository";
import type { AnalyticsFilters } from "../../types/analytics";
import type { AnalyticsDto, GoalReportDto, UserChangesDto } from "../../types/api";
import type { User } from "../../types/golf";
import { labUser } from "../fixtures/lab";
import { InMemoryFriendships, type InMemoryFriendshipsSeed } from "./InMemoryFriendships";

export interface FakeLabSeed {
  user?: Partial<User>;
  /** Analytics by golfer. A golfer with none fails to load, as the server's 404 does. */
  analytics?: Record<string, AnalyticsDto>;
  goalReport?: GoalReportDto | null;
  friends?: InMemoryFriendshipsSeed;
}

/** The Lab's reads and its one write, in memory. */
export class FakeLabRepository implements LabRepository {
  user: User;
  readonly analytics: Record<string, AnalyticsDto>;
  goalReport: GoalReportDto | null;
  readonly friendships: InMemoryFriendships;
  /** Golfers whose analytics were asked for, in order. */
  readonly analyticsRequests: string[] = [];
  /** The filters each analytics read asked for, in the same order. */
  readonly analyticsFilters: AnalyticsFilters[] = [];
  readonly updates: UserChangesDto[] = [];
  goalReportRequests = 0;
  saveError: Error | null = null;
  private held: Promise<void> | null = null;
  private release: (() => void) | null = null;

  constructor({ user = {}, analytics = {}, goalReport = null, friends = {} }: FakeLabSeed = {}) {
    this.user = { ...labUser, ...user };
    this.analytics = analytics;
    this.goalReport = goalReport;
    this.friendships = new InMemoryFriendships(friends);
  }

  async getUser(): Promise<User> {
    return this.user;
  }

  async updateUser(_userId: string, changes: UserChangesDto): Promise<User> {
    this.updates.push(changes);
    if (this.saveError) throw this.saveError;
    if (changes.scoring_goal !== undefined) this.user = { ...this.user, scoring_goal: changes.scoring_goal };
    return this.user;
  }

  async getGoalReport(): Promise<GoalReportDto> {
    this.goalReportRequests += 1;
    if (!this.goalReport) throw new Error("No goal report.");
    return this.goalReport;
  }

  /** Analytics reads wait until `finishAnalytics()`, so a load in flight can be seen. */
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

  async getFriendships(userId: string): Promise<Friendship[]> {
    return this.friendships.list().map((dto) => friendshipFromDto(dto, userId));
  }
}
