import { goalReportRepository, type GoalReportRepository } from "@/data/goalReportRepository";
import { userRepository, type UserRepository } from "@/data/userRepository";
import { api } from "@/lib/api";
import type { DashboardDto } from "@/types/api";

export interface DashboardRepository extends GoalReportRepository, Pick<UserRepository, "getUser"> {
  getDashboard(userId: string): Promise<DashboardDto>;
}

export const dashboardRepository: DashboardRepository = {
  getDashboard: (userId) => api.getDashboard(userId),
  getUser: (userId) => userRepository.getUser(userId),
  getGoalReport: (userId, limit) => goalReportRepository.getGoalReport(userId, limit),
};
