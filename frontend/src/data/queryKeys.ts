export const queryKeys = {
  rounds: (userId: string) => ["rounds", userId] as const,
  round: (roundId: string | undefined) => ["round", roundId] as const,
  roundComparison: (userId: string, roundId: string | undefined) =>
    ["round-comparison", userId, roundId] as const,
  dashboard: (userId: string) => ["dashboard", userId] as const,
  careerAnalytics: (userId: string) => ["career-analytics", userId] as const,
  courses: (userId: string, search = "") => ["courses", userId, search] as const,
  course: (courseId: string | undefined) => ["course", courseId] as const,
  courseAnalytics: (userId: string, courseId: string | undefined) =>
    ["course-analytics", userId, courseId] as const,
  handicap: (userId: string) => ["handicap", userId] as const,
  user: (userId: string) => ["user", userId] as const,
  goalReport: (userId: string) => ["goal-report", userId] as const,
  /** A golfer's analytics, per set of filters. The Analytics page and The Lab read the same entries. */
  analytics: (userId: string, filters?: unknown) =>
    filters === undefined
      ? (["analytics", userId] as const)
      : (["analytics", userId, filters] as const),
  playedCourses: (userId: string) => ["played-courses", userId] as const,
  /** The text read off one picked photo, ahead of extract. */
  scanText: (photoId: string | null) => ["scan-text", photoId] as const,
  /** Every friendship the golfer is part of, mapped to their side of it. */
  friendships: (userId: string) => ["friendships", userId] as const,
  settings: (userId: string) => ["settings", userId] as const,
  /** One emailed verification token, spent once. */
  emailVerification: (token: string) => ["email-verification", token] as const,
};

export const mutationKeys = {
  /** A scan being read. The scan page looks for one still running when the golfer comes back. */
  extractScorecard: ["extract-scorecard"] as const,
};
