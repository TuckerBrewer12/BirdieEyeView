import { userRepository, type UserRepository } from "@/data/userRepository";
import { api } from "@/lib/api";
import { roundsRepository, type RoundsRepository } from "../rounds/roundsRepository";
import type { PlayedCourseDto } from "@/types/api";
import { analyticsFrom, type Analytics, type AnalyticsFilters, type PlayedCourse } from "./model";

export interface AnalyticsRepository extends Pick<UserRepository, "getUser">, Pick<RoundsRepository, "getRound"> {
  /** The figures over the rounds the filters pick, and the series the charts draw from them. */
  getAnalytics(userId: string, filters: AnalyticsFilters): Promise<Analytics>;
  /** The courses the golfer has a round at, for the course filter. */
  getPlayedCourses(userId: string): Promise<PlayedCourse[]>;
}

export function playedCourseFrom(dto: PlayedCourseDto): PlayedCourse {
  return { id: dto.id, name: dto.name ?? null, location: dto.location ?? null };
}

export const analyticsRepository: AnalyticsRepository = {
  getAnalytics: async (userId, filters) => analyticsFrom(await api.getAnalytics(userId, filters)),
  getPlayedCourses: async (userId) => (await api.getPlayedCourses(userId)).map(playedCourseFrom),
  getUser: (userId) => userRepository.getUser(userId),
  getRound: (roundId) => roundsRepository.getRound(roundId),
};
