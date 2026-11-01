import { goalReportRepository, type GoalReportRepository } from "@/data/goalReportRepository";
import { userRepository, type UserRepository } from "@/data/userRepository";
import { api } from "@/lib/api";
import type { DashboardData } from "@/types/golf";

export interface DashboardRepository extends GoalReportRepository, Pick<UserRepository, "getUser"> {
  /** The dashboard's figures, trend series included. */
  getDashboard(userId: string): Promise<DashboardData>;
}

export const dashboardRepository: DashboardRepository = {
  getDashboard: (userId) => api.getDashboard(userId),
  getUser: (userId) => userRepository.getUser(userId),
  getGoalReport: (userId, limit) => goalReportRepository.getGoalReport(userId, limit),
};
