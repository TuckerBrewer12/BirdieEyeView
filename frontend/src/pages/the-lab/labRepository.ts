import { analyticsRepository, type AnalyticsRepository } from "@/data/analyticsRepository";
import { friendsRepository, type FriendsRepository } from "@/data/friendsRepository";
import { goalReportRepository, type GoalReportRepository } from "@/data/goalReportRepository";
import { userRepository, type UserRepository } from "@/data/userRepository";
import { benchmarkComparisonFrom, type BenchmarkComparison, type BenchmarkTarget } from "@/domain/benchmark";
import { api } from "@/lib/api";

export interface LabRepository
  extends AnalyticsRepository,
    GoalReportRepository,
    Pick<UserRepository, "getUser" | "updateUser">,
    Pick<FriendsRepository, "getFriendships"> {
  getBenchmarkComparison(userId: string, target: BenchmarkTarget): Promise<BenchmarkComparison>;
}

export const labRepository: LabRepository = {
  getAnalytics: (userId, filters) => analyticsRepository.getAnalytics(userId, filters),
  getUser: (userId) => userRepository.getUser(userId),
  updateUser: (userId, changes) => userRepository.updateUser(userId, changes),
  getGoalReport: (userId, limit) => goalReportRepository.getGoalReport(userId, limit),
  getFriendships: (userId) => friendsRepository.getFriendships(userId),
  getBenchmarkComparison: async (userId, target) =>
    benchmarkComparisonFrom(await api.getBenchmarkComparison(userId, target)),
};
