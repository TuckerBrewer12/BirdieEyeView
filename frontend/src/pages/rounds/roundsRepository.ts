import { api } from "@/lib/api";
import type { RoundSummary } from "@/types/golf";

export interface RoundsRepository {
  getRoundsForUser(userId: string, limit?: number): Promise<RoundSummary[]>;
  linkCourse(roundId: string, courseId: string): Promise<RoundSummary>;
}

export const roundsRepository: RoundsRepository = {
  getRoundsForUser: (userId, limit = 100) => api.getRoundsForUser(userId, limit),
  linkCourse: (roundId, courseId) => api.linkCourse(roundId, courseId),
};
