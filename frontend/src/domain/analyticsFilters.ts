/** Which rounds a golfer's analytics are worked out over. The server takes these; it never sends them. */
export interface AnalyticsFilters {
  limit: number;
  timeframe: "all" | "ytd" | "1y";
  courseId: "all" | "home" | string;
}
