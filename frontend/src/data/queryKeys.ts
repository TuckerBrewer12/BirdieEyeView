export const queryKeys = {
  rounds: (userId: string) => ["rounds", userId] as const,
  round: (roundId: string | undefined) => ["round", roundId] as const,
  /** Every round's detail. Each carries the golfer's course handicap and net score off their index. */
  allRounds: () => ["round"] as const,
  roundComparison: (userId: string, roundId: string | undefined) =>
    ["round-comparison", userId, roundId] as const,
  dashboard: (userId: string) => ["dashboard", userId] as const,
  courses: (userId: string, search = "") => ["courses", userId, search] as const,
  /** Every course list entry for the golfer, searched or not. Each carries their record at the course. */
  allCourseLists: (userId: string) => ["courses", userId] as const,
  course: (courseId: string | undefined) => ["course", courseId] as const,
  /** Every course's detail. Each tee carries the golfer's course handicap off their index. */
  allCourses: () => ["course"] as const,
  courseAnalytics: (userId: string, courseId: string | undefined) =>
    ["course-analytics", userId, courseId] as const,
  /** The golfer's figures at every course. */
  allCourseAnalytics: (userId: string) => ["course-analytics", userId] as const,
  user: (userId: string) => ["user", userId] as const,
  /** The goal report, per goal: a report for one goal never stands in for another's. Leave the goal out for all of them. */
  goalReport: (userId: string, goal?: number) =>
    goal === undefined ? (["goal-report", userId] as const) : (["goal-report", userId, goal] as const),
  /** A golfer's analytics, per set of filters. The Analytics page and its Profile read the same entries. */
  analytics: (userId: string, filters?: unknown) =>
    filters === undefined
      ? (["analytics", userId] as const)
      : (["analytics", userId, filters] as const),
  /**
   * The golfer's rounds against one benchmark. It sits under their analytics, so whatever
   * refreshes their analytics refreshes it too.
   */
  benchmarkComparison: (userId: string, target: unknown) => ["analytics", userId, "benchmark", target] as const,
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
