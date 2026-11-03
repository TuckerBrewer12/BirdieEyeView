import type { AnalyticsFilters } from "@/domain/analyticsFilters";
import type { BenchmarkTarget } from "@/domain/benchmark";
import type {
  AnalyticsDto,
  BenchmarkComparisonDto,
  CourseAnalyticsDto,
  CourseDto,
  CourseSummaryDto,
  DashboardDto,
  FriendshipDto,
  FriendshipStatusRequestDto,
  GoalReportDto,
  HandicapIndexDto,
  PlayedCourseDto,
  RoundComparisonDto,
  RoundDto,
  RoundSummaryDto,
  UserDto,
} from "@/types/api";
import { apiUrl } from "@/lib/apiBase";
import { withAuthHeaders } from "@/lib/sessionToken";
import {
  fetchWithUserFacingError,
  getUserFacingError,
  parseJsonResponse,
  USER_FACING_ERRORS,
} from "@/lib/userFacingErrors";

async function fetchJSON<T>(path: string): Promise<T> {
  const res = await fetchWithUserFacingError(apiUrl(`/api${path}`), {
    credentials: "include",
    headers: withAuthHeaders(),
  });
  if (!res.ok) {
    throw new Error(await getUserFacingError(res));
  }
  return parseJsonResponse<T>(res);
}

async function postJSON<T>(path: string, body: unknown): Promise<T> {
  const res = await fetchWithUserFacingError(apiUrl(`/api${path}`), {
    method: "POST",
    credentials: "include",
    headers: withAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(await getUserFacingError(res));
  }
  return parseJsonResponse<T>(res);
}

async function putJSON<T>(path: string, body: unknown): Promise<T> {
  const res = await fetchWithUserFacingError(apiUrl(`/api${path}`), {
    method: "PUT",
    credentials: "include",
    headers: withAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(await getUserFacingError(res));
  }
  return parseJsonResponse<T>(res);
}

async function patchJSON<T>(path: string, body: unknown): Promise<T> {
  const res = await fetchWithUserFacingError(apiUrl(`/api${path}`), {
    method: "PATCH",
    credentials: "include",
    headers: withAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(await getUserFacingError(res));
  }
  return parseJsonResponse<T>(res);
}

export const api = {
  getDashboard: (userId: string) =>
    fetchJSON<DashboardDto>(`/stats/dashboard/${userId}`),

  getRoundsForUser: (userId: string, limit = 100, offset = 0) =>
    fetchJSON<RoundSummaryDto[]>(`/rounds/user/${userId}?limit=${limit}&offset=${offset}`),

  getRound: (roundId: string) =>
    fetchJSON<RoundDto>(`/rounds/${roundId}`),

  updateRound: (
    roundId: string,
    body: {
      hole_scores?: { hole_number: number; strokes?: number | null; putts?: number | null; fairway_hit?: boolean | null; green_in_regulation?: boolean | null }[];
      tee_box?: string | null;
      notes?: string;
      weather_conditions?: string;
      course_name_played?: string | null;
    }
  ) => putJSON<RoundDto>(`/rounds/${roundId}`, body),

  linkCourse: (roundId: string, courseId: string) =>
    postJSON<RoundSummaryDto>(`/rounds/${roundId}/link-course`, { course_id: courseId }),

  deleteRound: async (roundId: string) => {
    const res = await fetchWithUserFacingError(apiUrl(`/api/rounds/${roundId}`), {
      method: "DELETE",
      credentials: "include",
      headers: withAuthHeaders(),
    }, USER_FACING_ERRORS.deleteRound);
    if (!res.ok) {
      throw new Error(await getUserFacingError(res, USER_FACING_ERRORS.deleteRound));
    }
  },

  getCourses: (userId?: string, limit = 50, offset = 0) => {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (userId) params.set("user_id", userId);
    return fetchJSON<CourseSummaryDto[]>(`/courses?${params}`);
  },

  searchCourses: (query: string, userId?: string, includeExternal = false) => {
    const params = new URLSearchParams({ q: query });
    if (userId) params.set("user_id", userId);
    if (includeExternal) params.set("include_external", "true");
    return fetchJSON<CourseSummaryDto[]>(`/courses/search?${params}`);
  },

  getCourse: (courseId: string) =>
    fetchJSON<CourseDto>(`/courses/${courseId}`),

  getUser: (userId: string) =>
    fetchJSON<UserDto>(`/users/${userId}`),

  updateUser: (userId: string, body: { home_course_id?: string | null; handicap?: number | null; scoring_goal?: number | null }) =>
    patchJSON<UserDto>(`/users/${userId}`, body),

  getGoalReport: (userId: string, limit = 50) =>
    fetchJSON<GoalReportDto>(`/stats/${userId}/goal-report?limit=${limit}`),

  cloneCourse: (courseId: string, userId: string) =>
    postJSON<CourseSummaryDto>(`/courses/${courseId}/clone?user_id=${encodeURIComponent(userId)}`, {}),

  getUserHandicap: (userId: string) =>
    fetchJSON<HandicapIndexDto>(`/users/${userId}/handicap`),

  getAnalytics: (userId: string, filters: AnalyticsFilters | number = 50) => {
    const f: AnalyticsFilters = typeof filters === "number"
      ? { limit: filters, timeframe: "all", courseId: "all" }
      : filters;
    const p = new URLSearchParams({ limit: String(f.limit) });
    if (f.timeframe !== "all") p.set("timeframe", f.timeframe);
    if (f.courseId !== "all") p.set("course_id", f.courseId);
    return fetchJSON<AnalyticsDto>(`/stats/analytics/${userId}?${p}`);
  },

  /** The golfer's last `limit` rounds held up against a handicap's shape, their peak's, or a friend's. */
  getBenchmarkComparison: (userId: string, target: BenchmarkTarget, limit = 20) => {
    const p = new URLSearchParams({ against: target.against, limit: String(limit) });
    if (target.against === "handicap") p.set("handicap", String(target.handicap));
    if (target.against === "friend") p.set("friend_id", target.friendId);
    return fetchJSON<BenchmarkComparisonDto>(`/stats/${userId}/benchmark?${p}`);
  },

  getPlayedCourses: (userId: string) =>
    fetchJSON<PlayedCourseDto[]>(`/stats/${userId}/played-courses`),

  getRoundComparison: (userId: string, roundId: string) =>
    fetchJSON<RoundComparisonDto>(`/stats/compare/${userId}/${roundId}`),

  getCourseAnalytics: (userId: string, courseId: string) =>
    fetchJSON<CourseAnalyticsDto>(`/stats/course-analytics/${userId}/${courseId}`),

  getFriendships: (status?: FriendshipDto["status"]) => {
    const params = new URLSearchParams();
    if (status) params.set("status", status);
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return fetchJSON<FriendshipDto[]>(`/users/me/friends${suffix}`);
  },

  sendFriendRequest: (addresseeFriendCode: string) =>
    postJSON<FriendshipDto>(`/users/me/friends`, { addressee_friend_code: addresseeFriendCode }),

  updateFriendshipStatus: (friendshipId: string, status: FriendshipStatusRequestDto["status"]) =>
    patchJSON<FriendshipDto>(`/users/me/friends/${friendshipId}`, { status }),
};
