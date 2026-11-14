export interface AnalyticsFilters {
  limit: number;
  timeframe: "all" | "ytd" | "1y";
  courseId: "all" | "home" | string;
}
