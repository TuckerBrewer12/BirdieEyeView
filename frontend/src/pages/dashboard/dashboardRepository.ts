import { api } from "@/lib/api";
import type { DashboardData, User } from "@/types/golf";
import type { GoalReport } from "@/types/analytics";

export interface DashboardRepository {
  /** The dashboard's figures, trend series included. */
  getDashboard(userId: string): Promise<DashboardData>;
  getUser(userId: string): Promise<User>;
  getGoalReport(userId: string, limit?: number): Promise<GoalReport>;
}

export const dashboardRepository: DashboardRepository = {
  getDashboard: (userId) => api.getDashboard(userId),
  getUser: (userId) => api.getUser(userId),
  getGoalReport: (userId, limit = 20) => api.getGoalReport(userId, limit),
};
