import type { DashboardData, User } from "../../types/golf";
import type { AnalyticsData, GoalReport } from "../../types/analytics";
import type { DashboardRepository } from "../../pages/dashboard/dashboardRepository";

export interface FakeDashboardRepositorySeed {
  dashboard?: DashboardData;
  dashboardError?: Error;
  analytics?: AnalyticsData | null;
  analyticsError?: Error;
  user?: User | null;
  goalReport?: GoalReport | null;
}

export class FakeDashboardRepository implements DashboardRepository {
  private readonly dashboard: DashboardData | undefined;
  private readonly dashboardError: Error | undefined;
  private readonly analytics: AnalyticsData | null | undefined;
  private readonly analyticsError: Error | undefined;
  private readonly user: User | null | undefined;
  private readonly goalReport: GoalReport | null | undefined;

  constructor(seed: FakeDashboardRepositorySeed = {}) {
    this.dashboard = seed.dashboard;
    this.dashboardError = seed.dashboardError;
    this.analytics = seed.analytics;
    this.analyticsError = seed.analyticsError;
    this.user = seed.user;
    this.goalReport = seed.goalReport;
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
}
