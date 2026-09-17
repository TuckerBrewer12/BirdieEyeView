import type { DashboardData, Round, User } from "../../types/golf";
import type { AnalyticsData, GoalReport } from "../../types/analytics";
import type { DashboardRepository } from "../../pages/dashboard/dashboardRepository";

export interface FakeDashboardRepositorySeed {
  dashboard?: DashboardData;
  dashboardError?: Error;
  analytics?: AnalyticsData | null;
  analyticsError?: Error;
  user?: User | null;
  goalReport?: GoalReport | null;
  rounds?: Round[];
}

export class FakeDashboardRepository implements DashboardRepository {
  readonly fetchedRoundIds: string[] = [];
  private readonly dashboard: DashboardData | undefined;
  private readonly dashboardError: Error | undefined;
  private readonly analytics: AnalyticsData | null | undefined;
  private readonly analyticsError: Error | undefined;
  private readonly user: User | null | undefined;
  private readonly goalReport: GoalReport | null | undefined;
  private readonly rounds: Map<string, Round>;

  constructor(seed: FakeDashboardRepositorySeed = {}) {
    this.dashboard = seed.dashboard;
    this.dashboardError = seed.dashboardError;
    this.analytics = seed.analytics;
    this.analyticsError = seed.analyticsError;
    this.user = seed.user;
    this.goalReport = seed.goalReport;
    this.rounds = new Map(
      (seed.rounds ?? []).filter((r) => r.id).map((r) => [r.id as string, r]),
    );
  }

  async getDashboard(): Promise<DashboardData> {
    if (this.dashboardError) throw this.dashboardError;
    if (!this.dashboard) throw new Error("Dashboard data failed to load.");
    return this.dashboard;
  }

  async getAnalytics(): Promise<AnalyticsData> {
    if (this.analyticsError) throw this.analyticsError;
    if (this.analytics == null) throw new Error("Analytics failed to load.");
    return this.analytics;
  }

  async getUser(): Promise<User> {
    if (!this.user) {
      return {
        id: "user-1",
        name: "Test Golfer",
        email: "test@example.com",
        home_course_id: null,
        handicap: null,
        created_at: null,
        scoring_goal: null,
      };
    }
    return this.user;
  }

  async getGoalReport(): Promise<GoalReport> {
    if (!this.goalReport) throw new Error("No goal report.");
    return this.goalReport;
  }

  async getRound(roundId: string): Promise<Round> {
    this.fetchedRoundIds.push(roundId);
    const round = this.rounds.get(roundId);
    if (!round) throw new Error(`Round ${roundId} not found.`);
    return round;
  }
}