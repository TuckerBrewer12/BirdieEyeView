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

export interface AnalyticsRepository
  extends SharedAnalyticsRepository,
    GoalReportRepository,
    Pick<UserRepository, "getUser" | "updateUser">,
    Pick<FriendsRepository, "getFriendships"> {
  getPlayedCourses(userId: string): Promise<PlayedCourse[]>;
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
