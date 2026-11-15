import { api } from "@/lib/api";
import type { AnalyticsFilters } from "@/domain/analyticsFilters";
import type { AnalyticsDto } from "@/types/api";

export interface AnalyticsRepository {
  getAnalytics(userId: string, filters: AnalyticsFilters): Promise<AnalyticsDto>;
}

export const analyticsRepository: AnalyticsRepository = {
  getAnalytics: (userId, filters) => api.getAnalytics(userId, filters),
};
