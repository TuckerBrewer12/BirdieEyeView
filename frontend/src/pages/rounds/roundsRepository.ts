import { api } from "@/lib/api";
import type { Course, Round, RoundSummary } from "@/types/golf";
import type { RoundComparison } from "@/types/analytics";

export type UpdateRoundBody = {
  hole_scores?: {
    hole_number: number;
    strokes?: number | null;
    putts?: number | null;
    fairway_hit?: boolean | null;
    green_in_regulation?: boolean | null;
  }[];
  tee_box?: string | null;
  notes?: string;
  weather_conditions?: string;
  course_name_played?: string | null;
};

export interface RoundsRepository {
  getRoundsForUser(userId: string, limit?: number): Promise<RoundSummary[]>;
  getRound(roundId: string): Promise<Round>;
  updateRound(roundId: string, body: UpdateRoundBody): Promise<Round>;
  deleteRound(roundId: string): Promise<void>;
  linkCourse(roundId: string, courseId: string): Promise<RoundSummary>;
  getCourse(courseId: string): Promise<Course>;
  getRoundComparison(userId: string, roundId: string): Promise<RoundComparison | null>;
  getUserHandicap(userId: string): Promise<{ handicap_index: number | null }>;
}

export const roundsRepository: RoundsRepository = {
  getRoundsForUser: (userId, limit = 100) => api.getRoundsForUser(userId, limit),
  getRound: (roundId) => api.getRound(roundId),
  updateRound: (roundId, body) => api.updateRound(roundId, body),
  deleteRound: (roundId) => api.deleteRound(roundId),
  linkCourse: (roundId, courseId) => api.linkCourse(roundId, courseId),
  getCourse: (courseId) => api.getCourse(courseId),
  getRoundComparison: (userId, roundId) => api.getRoundComparison(userId, roundId),
  getUserHandicap: (userId) => api.getUserHandicap(userId),
};
