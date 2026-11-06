import type { AnalyticsFilters } from "@/domain/analyticsFilters";
import type { BenchmarkTarget } from "@/domain/benchmark";
import type {
  AnalyticsDto,
  AuthUserDto,
  BenchmarkComparisonDto,
  CourseAnalyticsDto,
  CourseDto,
  CourseSummaryDto,
  DashboardDto,
  FriendshipDto,
  FriendshipStatusRequestDto,
  GoalReportDto,
  OcrTextDto,
  PlayedCourseDto,
  RoundComparisonDto,
  RoundDto,
  RoundSummaryDto,
  SaveScanDto,
  SaveScanRequestDto,
  ScanDto,
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

async function postJSON<T>(path: string, body: unknown, fallback?: string): Promise<T> {
  const res = await fetchWithUserFacingError(apiUrl(`/api${path}`), {
    method: "POST",
    credentials: "include",
    headers: withAuthHeaders({ "Content-Type": "application/json" }),
    body: JSON.stringify(body),
  }, fallback);
  if (!res.ok) {
    throw new Error(await getUserFacingError(res, fallback));
  }
  return parseJsonResponse<T>(res, fallback);
}

/** A multipart POST: a scorecard photo and the fields sent with it. */
async function postForm(path: string, fields: Record<string, string | File>, fallback?: string): Promise<Response> {
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) form.append(name, value);
  return fetchWithUserFacingError(apiUrl(`/api${path}`), {
    method: "POST",
    credentials: "include",
    headers: withAuthHeaders(),
    body: form,
  }, fallback);
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
  /** The signed-in user, or null when the session has ended (401 or 403). */
  getAuthSession: async (): Promise<AuthUserDto | null> => {
    const res = await fetchWithUserFacingError(apiUrl("/api/auth/me"), {
      credentials: "include",
      headers: withAuthHeaders(),
    }, USER_FACING_ERRORS.account);
    if (res.status === 401 || res.status === 403) return null;
    if (!res.ok) {
      throw new Error(await getUserFacingError(res, USER_FACING_ERRORS.account));
    }
    return parseJsonResponse<AuthUserDto>(res, USER_FACING_ERRORS.account);
  },

  /** The card's text, read ahead of the scan. Null when the server could not read it. */
  readScanText: async (photo: File): Promise<string | null> => {
    const res = await postForm("/scan/ocr", { file: photo });
    if (!res.ok) return null;
    const body = await parseJsonResponse<OcrTextDto>(res);
    return body.ocr_text || null;
  },

  /** Reads a scorecard photo. `fields` carries the photo as `file` and the optional context fields. */
  extractScan: async (fields: Record<string, string | File>): Promise<ScanDto> => {
    const res = await postForm("/scan/extract", fields, USER_FACING_ERRORS.scan);
    if (!res.ok) {
      throw new Error(await getUserFacingError(res, USER_FACING_ERRORS.scan));
    }
    return parseJsonResponse<ScanDto>(res, USER_FACING_ERRORS.scan);
  },

  saveScan: (request: SaveScanRequestDto) =>
    postJSON<SaveScanDto>("/scan/save", request, USER_FACING_ERRORS.saveRound),

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

  getAnalytics: (userId: string, filters: AnalyticsFilters | number = 50) => {
    const f: AnalyticsFilters = typeof filters === "number"
      ? { limit: filters, timeframe: "all", courseId: "all" }
      : filters;
    const p = new URLSearchParams({ limit: String(f.limit) });
    if (f.timeframe !== "all") p.set("timeframe", f.timeframe);
    if (f.courseId !== "all") p.set("course_id", f.courseId);
    return fetchJSON<AnalyticsDto>(`/stats/analytics/${userId}?${p}`);
  },

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
