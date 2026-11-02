import { api } from "@/lib/api";
import type { AnalyticsFilters } from "@/types/analytics";
import type { AnalyticsDto } from "@/types/api";

export interface AnalyticsRepository {
  /**
   * A golfer's figures over the rounds the filters pick, as the server sends them. One response
   * serves every screen that reads it; each shapes its own view of it.
   */
  getAnalytics(userId: string, filters: AnalyticsFilters): Promise<AnalyticsDto>;
}

export const analyticsRepository: AnalyticsRepository = {
  getAnalytics: (userId, filters) => api.getAnalytics(userId, filters),
};
