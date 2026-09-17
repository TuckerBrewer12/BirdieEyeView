import { api } from "@/lib/api";
import type { DashboardData, Round, User } from "@/types/golf";
import type { AnalyticsData, GoalReport } from "@/types/analytics";

export interface DashboardRepository {
  getDashboard(userId: string): Promise<DashboardData>;
  getAnalytics(userId: string): Promise<AnalyticsData>;
  getUser(userId: string): Promise<User>;
  getGoalReport(userId: string, limit?: number): Promise<GoalReport>;
  getRound(roundId: string): Promise<Round>;
}

export const dashboardRepository: DashboardRepository = {
  getDashboard: (userId) => api.getDashboard(userId),
  getAnalytics: (userId) =>
    api.getAnalytics(userId, { limit: 20, timeframe: "all", courseId: "all" }),
  getUser: (userId) => api.getUser(userId),
  getGoalReport: (userId, limit = 20) => api.getGoalReport(userId, limit),
  getRound: (roundId) => api.getRound(roundId),
};
