export const queryKeys = {
  rounds: (userId: string) => ["rounds", userId] as const,
  round: (roundId: string | undefined) => ["round", roundId] as const,
  allRounds: () => ["round"] as const,
  roundComparison: (userId: string, roundId: string | undefined) =>
    ["round-comparison", userId, roundId] as const,
  dashboard: (userId: string) => ["dashboard", userId] as const,
  courses: (userId: string, search = "") => ["courses", userId, search] as const,
  allCourseLists: (userId: string) => ["courses", userId] as const,
  course: (courseId: string | undefined) => ["course", courseId] as const,
  allCourses: () => ["course"] as const,
  courseAnalytics: (userId: string, courseId: string | undefined) =>
    ["course-analytics", userId, courseId] as const,
  allCourseAnalytics: (userId: string) => ["course-analytics", userId] as const,
  user: (userId: string) => ["user", userId] as const,
  goalReport: (userId: string, goal?: number) =>
    goal === undefined ? (["goal-report", userId] as const) : (["goal-report", userId, goal] as const),
  analytics: (userId: string, filters?: unknown) =>
    filters === undefined
      ? (["analytics", userId] as const)
      : (["analytics", userId, filters] as const),
  benchmarkComparison: (userId: string, target: unknown) => ["analytics", userId, "benchmark", target] as const,
  playedCourses: (userId: string) => ["played-courses", userId] as const,
  scanText: (photoId: string | null) => ["scan-text", photoId] as const,
  friendships: (userId: string) => ["friendships", userId] as const,
  pendingFriendships: (userId: string) => ["pending-friendships", userId] as const,
  settings: (userId: string) => ["settings", userId] as const,
  emailVerification: (token: string) => ["email-verification", token] as const,
};

export const mutationKeys = {
  extractScorecard: ["extract-scorecard"] as const,
};
