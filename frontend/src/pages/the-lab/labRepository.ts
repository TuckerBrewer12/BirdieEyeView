import { analyticsRepository, type AnalyticsRepository } from "@/data/analyticsRepository";
import { friendsRepository, type FriendsRepository } from "@/data/friendsRepository";
import { goalReportRepository, type GoalReportRepository } from "@/data/goalReportRepository";
import { userRepository, type UserRepository } from "@/data/userRepository";
import { benchmarkComparisonFrom, type BenchmarkComparison, type BenchmarkTarget } from "@/domain/benchmark";
import { api } from "@/lib/api";

/** The Lab reads shared data (analytics, the goal report, the golfer and their friends) and its own comparison. */
export interface LabRepository
  extends AnalyticsRepository,
    GoalReportRepository,
    Pick<UserRepository, "getUser" | "updateUser">,
    Pick<FriendsRepository, "getFriendships"> {
  /** The golfer's last 20 rounds against a handicap's shape, their peak's, or a friend's, as the server compared them. */
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
