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
  RoundChangesDto,
  RoundComparisonDto,
  RoundDto,
  RoundSummaryDto,
  SaveScanDto,
  SaveScanRequestDto,
  ScanDto,
  ScanReportDto,
  ScanReportErrorDto,
  UserChangesDto,
  UserDto,
} from "@/types/api";
import { apiUrl } from "@/lib/apiBase";
import { withAuthHeaders } from "@/lib/sessionToken";
import type { FailedScanAttempt } from "@/domain/scanReport";
import { readScanFailure, ScanFailedError } from "@/lib/scanReports";
import {
  fetchWithUserFacingError,
  getUserFacingError,
  messageFrom,
  parseJsonResponse,
  USER_FACING_ERRORS,
} from "@/lib/userFacingErrors";

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

interface RequestOptions {
  method?: Method;
  body?: unknown;
  fallback?: string;
}

async function send(path: string, { method = "GET", body, fallback }: RequestOptions = {}): Promise<Response> {
  const hasBody = body !== undefined;
  const res = await fetchWithUserFacingError(apiUrl(`/api${path}`), {
    method,
    credentials: "include",
    headers: withAuthHeaders(hasBody ? { "Content-Type": "application/json" } : {}),
    ...(hasBody && { body: JSON.stringify(body) }),
  }, fallback);
  if (!res.ok) {
    throw new Error(await getUserFacingError(res, fallback));
  }
  return res;
}

async function requestJSON<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const res = await send(path, options);
  return parseJsonResponse<T>(res, options.fallback);
}

const fetchJSON = <T>(path: string) => requestJSON<T>(path);
const postJSON = <T>(path: string, body: unknown, fallback?: string) =>
  requestJSON<T>(path, { method: "POST", body, fallback });
const putJSON = <T>(path: string, body: unknown) => requestJSON<T>(path, { method: "PUT", body });
const patchJSON = <T>(path: string, body: unknown) => requestJSON<T>(path, { method: "PATCH", body });

function withQuery(path: string, params: URLSearchParams): string {
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}

async function postForm(
  path: string,
  fields: Record<string, string | File>,
  fallback?: string,
  signal?: AbortSignal,
): Promise<Response> {
  const form = new FormData();
  for (const [name, value] of Object.entries(fields)) form.append(name, value);
  return fetchWithUserFacingError(apiUrl(`/api${path}`), {
    method: "POST",
    credentials: "include",
    headers: withAuthHeaders(),
    body: form,
    signal,
  }, fallback);
}

function isReportError(payload: unknown): payload is ScanReportErrorDto {
  return typeof payload === "object" && payload !== null && "code" in payload;
}

async function reportFailure(res: Response): Promise<string> {
  if (res.status === 429) return USER_FACING_ERRORS.tooManyReports;
  const payload: unknown = await res.json().catch(() => null);
  return isReportError(payload) && payload.code === "report_storage_unavailable"
    ? USER_FACING_ERRORS.reportUnavailable
    : USER_FACING_ERRORS.reportNotSaved;
}

export const api = {
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

  readScanText: async (photo: File): Promise<string | null> => {
    const res = await postForm("/scan/ocr", { file: photo });
    if (!res.ok) return null;
    const body = await parseJsonResponse<OcrTextDto>(res);
    return body.ocr_text || null;
  },

  extractScan: async (fields: Record<string, string | File>, signal?: AbortSignal): Promise<ScanDto> => {
    let res: Response;
    try {
      res = await postForm("/scan/extract", fields, USER_FACING_ERRORS.scan, signal);
    } catch (error) {
      throw new ScanFailedError(messageFrom(error, USER_FACING_ERRORS.scan), {
        category: "network_error", stage: "unknown", http_status: null,
      });
    }
    if (!res.ok) {
      const failure = await readScanFailure(res);
      throw new ScanFailedError(await getUserFacingError(res, USER_FACING_ERRORS.scan), failure);
    }
    try {
      return await parseJsonResponse<ScanDto>(res, USER_FACING_ERRORS.scan);
    } catch (error) {
      throw new ScanFailedError(messageFrom(error, USER_FACING_ERRORS.scan), {
        category: "invalid_response", stage: "unknown", http_status: res.status,
      });
    }
  },

  reportFailedScan: async (attempt: FailedScanAttempt): Promise<ScanReportDto> => {
    const form = new FormData();
    form.append("file", attempt.image, `scorecard.${attempt.extension}`);
    form.append("metadata", JSON.stringify({
      schema_version: 1,
      retry_key: attempt.retryKey,
      category: attempt.failure.category,
      stage: attempt.failure.stage,
      http_status: attempt.failure.http_status,
    }));
    const res = await fetchWithUserFacingError(apiUrl("/api/scan/reports"), {
      method: "POST",
      credentials: "omit",
      referrerPolicy: "no-referrer",
      cache: "no-store",
      body: form,
    }, USER_FACING_ERRORS.reportNotSaved);
    if (!res.ok) throw new Error(await reportFailure(res));
    const report = await parseJsonResponse<ScanReportDto>(res, USER_FACING_ERRORS.reportNotSaved);
    if (report.status !== "saved") throw new Error(USER_FACING_ERRORS.reportNotSaved);
    return report;
  },

  saveScan: (request: SaveScanRequestDto) =>
    postJSON<SaveScanDto>("/scan/save", request, USER_FACING_ERRORS.saveRound),

  getDashboard: (userId: string) =>
    fetchJSON<DashboardDto>(`/stats/dashboard/${userId}`),

  getRoundsForUser: (userId: string, limit = 100, offset = 0) =>
    fetchJSON<RoundSummaryDto[]>(`/rounds/user/${userId}?limit=${limit}&offset=${offset}`),

  getRound: (roundId: string) =>
    fetchJSON<RoundDto>(`/rounds/${roundId}`),

  updateRound: (roundId: string, changes: RoundChangesDto) =>
    putJSON<RoundDto>(`/rounds/${roundId}`, changes),

  linkCourse: (roundId: string, courseId: string) =>
    postJSON<RoundSummaryDto>(`/rounds/${roundId}/link-course`, { course_id: courseId }),

  deleteRound: async (roundId: string): Promise<void> => {
    await send(`/rounds/${roundId}`, { method: "DELETE", fallback: USER_FACING_ERRORS.deleteRound });
  },

  getCourses: (userId?: string, limit = 50, offset = 0) => {
    const params = new URLSearchParams({ limit: String(limit), offset: String(offset) });
    if (userId) params.set("user_id", userId);
    return fetchJSON<CourseSummaryDto[]>(withQuery("/courses", params));
  },

  searchCourses: (query: string, userId?: string, includeExternal = false, includeRecord = false) => {
    const params = new URLSearchParams({ q: query });
    if (userId) params.set("user_id", userId);
    if (includeExternal) params.set("include_external", "true");
    if (includeRecord) params.set("include_record", "true");
    return fetchJSON<CourseSummaryDto[]>(withQuery("/courses/search", params));
  },

  getCourse: (courseId: string) =>
    fetchJSON<CourseDto>(`/courses/${courseId}`),

  getUser: (userId: string) =>
    fetchJSON<UserDto>(`/users/${userId}`),

  updateUser: (userId: string, changes: UserChangesDto) =>
    patchJSON<UserDto>(`/users/${userId}`, changes),

  getGoalReport: (userId: string, limit = 50) =>
    fetchJSON<GoalReportDto>(`/stats/${userId}/goal-report?limit=${limit}`),

  cloneCourse: (courseId: string, userId: string) =>
    postJSON<CourseSummaryDto>(`/courses/${courseId}/clone?user_id=${encodeURIComponent(userId)}`, {}),

  getAnalytics: (userId: string, filters: AnalyticsFilters) => {
    const params = new URLSearchParams({ limit: String(filters.limit) });
    if (filters.timeframe !== "all") params.set("timeframe", filters.timeframe);
    if (filters.courseId !== "all") params.set("course_id", filters.courseId);
    return fetchJSON<AnalyticsDto>(withQuery(`/stats/analytics/${userId}`, params));
  },

  getBenchmarkComparison: (userId: string, target: BenchmarkTarget, limit = 20) => {
    const params = new URLSearchParams({ against: target.against, limit: String(limit) });
    if (target.against === "handicap") params.set("handicap", String(target.handicap));
    if (target.against === "friend") params.set("friend_id", target.friendId);
    return fetchJSON<BenchmarkComparisonDto>(withQuery(`/stats/${userId}/benchmark`, params));
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
    return fetchJSON<FriendshipDto[]>(withQuery("/users/me/friends", params));
  },

  sendFriendRequest: (addresseeFriendCode: string) =>
    postJSON<FriendshipDto>(`/users/me/friends`, { addressee_friend_code: addresseeFriendCode }),

  updateFriendshipStatus: (friendshipId: string, status: FriendshipStatusRequestDto["status"]) =>
    patchJSON<FriendshipDto>(`/users/me/friends/${friendshipId}`, { status }),
};
