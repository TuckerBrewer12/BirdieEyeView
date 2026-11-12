import {
  analyticsRepository as sharedAnalyticsRepository,
  type AnalyticsRepository as SharedAnalyticsRepository,
} from "@/data/analyticsRepository";
import { friendsRepository, type FriendsRepository } from "@/data/friendsRepository";
import { goalReportRepository, type GoalReportRepository } from "@/data/goalReportRepository";
import { userRepository, type UserRepository } from "@/data/userRepository";
import { benchmarkComparisonFrom, type BenchmarkComparison, type BenchmarkTarget } from "@/domain/benchmark";
import { api } from "@/lib/api";
import type { PlayedCourseDto } from "@/types/api";
import type { PlayedCourse } from "./model";

/**
 * The analytics page reads the shared analytics (its filters', and the profile's last 20), the
 * goal report, the golfer and their friends, and its own course menu and comparison. It writes
 * one thing: the golfer's goal.
 */
export interface AnalyticsRepository
  extends SharedAnalyticsRepository,
    GoalReportRepository,
    Pick<UserRepository, "getUser" | "updateUser">,
    Pick<FriendsRepository, "getFriendships"> {
  /** The courses the golfer has a round at, for the course menu. */
  getPlayedCourses(userId: string): Promise<PlayedCourse[]>;
  /** The golfer's last 20 rounds against a handicap's shape or a friend's, as the server compared them. */
  getBenchmarkComparison(userId: string, target: BenchmarkTarget): Promise<BenchmarkComparison>;
}

export function playedCourseFrom(dto: PlayedCourseDto): PlayedCourse {
  return { id: dto.id, name: dto.name ?? null, location: dto.location ?? null };
}

export const analyticsRepository: AnalyticsRepository = {
  getAnalytics: (userId, filters) => sharedAnalyticsRepository.getAnalytics(userId, filters),
  getPlayedCourses: async (userId) => (await api.getPlayedCourses(userId)).map(playedCourseFrom),
  getUser: (userId) => userRepository.getUser(userId),
  updateUser: (userId, changes) => userRepository.updateUser(userId, changes),
  getGoalReport: (userId, limit) => goalReportRepository.getGoalReport(userId, limit),
  getFriendships: (userId) => friendsRepository.getFriendships(userId),
  getBenchmarkComparison: async (userId, target) =>
    benchmarkComparisonFrom(await api.getBenchmarkComparison(userId, target)),
};
