import { api } from "@/lib/api";
import type { GoalReportDto } from "@/types/api";

export interface GoalReportRepository {
  /** How far the golfer is from their scoring goal over their last `limit` rounds, and where to find the strokes. */
  getGoalReport(userId: string, limit?: number): Promise<GoalReportDto>;
}

export const goalReportRepository: GoalReportRepository = {
  getGoalReport: (userId, limit = 20) => api.getGoalReport(userId, limit),
};
