import {
  analyticsRepository as sharedAnalyticsRepository,
  type AnalyticsRepository as SharedAnalyticsRepository,
} from "@/data/analyticsRepository";
import { userRepository, type UserRepository } from "@/data/userRepository";
import { api } from "@/lib/api";
import type { PlayedCourseDto } from "@/types/api";
import type { PlayedCourse } from "./model";

/** The shared analytics read (`data/useAnalytics`), plus what only this page asks for. */
export interface AnalyticsRepository extends SharedAnalyticsRepository, Pick<UserRepository, "getUser"> {
  /** The courses the golfer has a round at, for the course filter. */
  getPlayedCourses(userId: string): Promise<PlayedCourse[]>;
}

export function playedCourseFrom(dto: PlayedCourseDto): PlayedCourse {
  return { id: dto.id, name: dto.name ?? null, location: dto.location ?? null };
}

export const analyticsRepository: AnalyticsRepository = {
  getAnalytics: (userId, filters) => sharedAnalyticsRepository.getAnalytics(userId, filters),
  getPlayedCourses: async (userId) => (await api.getPlayedCourses(userId)).map(playedCourseFrom),
  getUser: (userId) => userRepository.getUser(userId),
};
