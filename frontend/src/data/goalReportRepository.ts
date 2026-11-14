import { api } from "@/lib/api";
import type { GoalReportDto } from "@/types/api";

export interface GoalReportRepository {
  getGoalReport(userId: string, limit?: number): Promise<GoalReportDto>;
}

export const goalReportRepository: GoalReportRepository = {
  getGoalReport: (userId, limit = 20) => api.getGoalReport(userId, limit),
};
