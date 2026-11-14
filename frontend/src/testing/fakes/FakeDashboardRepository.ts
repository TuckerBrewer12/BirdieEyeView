import type { DashboardDto, GoalReportDto, UserDto } from "../../types/api";
import type { DashboardRepository } from "../../pages/dashboard/dashboardRepository";

export interface FakeDashboardRepositorySeed {
  dashboard?: DashboardDto;
  dashboardError?: Error;
  user?: UserDto | null;
  goalReport?: GoalReportDto | null;
}

export class FakeDashboardRepository implements DashboardRepository {
  private readonly dashboard: DashboardDto | undefined;
  private readonly dashboardError: Error | undefined;
  private readonly user: UserDto | null | undefined;
  private readonly goalReport: GoalReportDto | null | undefined;

  constructor(seed: FakeDashboardRepositorySeed = {}) {
    this.dashboard = seed.dashboard;
    this.dashboardError = seed.dashboardError;
    this.user = seed.user;
    this.goalReport = seed.goalReport;
  }

  async getDashboard(): Promise<DashboardDto> {
    if (this.dashboardError) throw this.dashboardError;
    if (!this.dashboard) throw new Error("Dashboard data failed to load.");
    return this.dashboard;
  }

  async getUser(): Promise<UserDto> {
    if (!this.user) {
      return {
        id: "user-1",
        name: "Test Golfer",
        email: "test@example.com",
        friend_code: null,
        home_course_id: null,
        handicap: null,
        created_at: null,
        scoring_goal: null,
      };
    }
    return this.user;
  }

  async getGoalReport(): Promise<GoalReportDto> {
    if (!this.goalReport) throw new Error("No goal report.");
    return this.goalReport;
  }
}
