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
  analytics: (userId: string, filters?: unknown) =>
    filters === undefined
      ? (["analytics", userId] as const)
      : (["analytics", userId, filters] as const),
  playedCourses: (userId: string) => ["played-courses", userId] as const,
  friendshipsAccepted: ["friendships", "accepted"] as const,
  friendshipsAll: ["friendships-all"] as const,
  friendCompare: (friendId: string) =>
    ["analytics", "friend-compare", friendId, { limit: 20 }] as const,
  settings: (userId: string) => ["settings", userId] as const,
};
