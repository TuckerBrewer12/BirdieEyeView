import { InMemoryRounds, type InMemoryRoundsSeed } from "./InMemoryRounds";
import {
  FakeHttpError,
  InMemoryFriendships,
  type InMemoryFriendshipsSeed,
} from "./InMemoryFriendships";
import type { FriendshipAnswer } from "../../data/friendsModel";
import type { UpdateRoundBody } from "../../pages/rounds/roundsRepository";
import type {
  AnalyticsDto,
  BenchmarkComparisonDto,
  DashboardDto,
  GoalReportDto,
  PlayedCourseDto,
  SaveScanRequestDto,
  ScanDto,
  UserChangesDto,
  UserDto,
} from "../../types/api";
import type { AnalyticsFilters } from "../../domain/analyticsFilters";
import { AUTH_MESSAGES } from "./FakeAuth";
import { analyticsForCourse } from "./analyticsResponses";

export const TEST_USER = {
  user_id: "user-1",
  name: "Test Golfer",
  email: "test@example.com",
  email_verified: true,
};

export interface FakeAccount {
  password: string;
  verified: boolean;
}

export type FakeAuthEndpoint =
  | "login"
  | "register"
  | "resend-verification"
  | "verify-email"
  | "forgot-password"
  | "reset-password";

export interface FakeBackendSeed extends InMemoryRoundsSeed {
  user?: typeof TEST_USER;
  profile?: UserDto;
  dashboard?: DashboardDto;
  analytics?: AnalyticsDto | null;
  analyticsByGolfer?: Record<string, AnalyticsDto>;
  analyticsFailsAtLimit?: number | null;
  analyticsByCourse?: Record<string, AnalyticsDto>;
  playedCourses?: PlayedCourseDto[];
  goalReport?: GoalReportDto | null;
  benchmarks?: Record<string, BenchmarkComparisonDto>;
  signedOut?: boolean;
  scan?: ScanDto;
  holdScan?: boolean;
  reportStorage?: boolean;
  profileError?: string | null;
  updateUserError?: string | null;
  friends?: Omit<InMemoryFriendshipsSeed, "userId">;
  accounts?: Record<string, FakeAccount>;
  verifyTokens?: string[];
  resetTokens?: string[];
  authErrors?: Partial<Record<FakeAuthEndpoint, string>>;
}

export interface FakeReply {
  status: number;
  body: unknown;
}

export class FakeBackend {
  user: typeof TEST_USER;
  profile: UserDto | undefined;
  dashboard: DashboardDto | undefined;
  analytics: AnalyticsDto | null | undefined;
  analyticsFailsAtLimit: number | null;
  analyticsByGolfer: Partial<Record<string, AnalyticsDto>>;
  readonly analyticsByCourse: Record<string, AnalyticsDto>;
  readonly playedCourses: PlayedCourseDto[];
  readonly analyticsRequests: AnalyticsFilters[] = [];
  goalReport: GoalReportDto | null | undefined;
  readonly benchmarks: Partial<Record<string, BenchmarkComparisonDto>>;
  scan: ScanDto | undefined;
  reportStorage: boolean;
  profileError: string | null;
  updateUserError: string | null;
  signedOut: boolean;
  readonly accounts: Partial<Record<string, FakeAccount>>;
  readonly verifyTokens: Set<string>;
  readonly resetTokens: Set<string>;
  readonly authErrors: Partial<Record<FakeAuthEndpoint, string>>;
  readonly registrations: Record<string, unknown>[] = [];
  readonly verificationResends: string[] = [];
  readonly resetRequests: string[] = [];
  readonly passwordResets: { token: string; new_password: string }[] = [];
  readonly store: InMemoryRounds;
  readonly friendships: InMemoryFriendships;
  private scanHold: Promise<void> | null = null;
  private releaseScan: (() => void) | null = null;
  private goalReportHold: Promise<void> | null = null;
  private releaseGoalReports: (() => void) | null = null;

  constructor(seed: FakeBackendSeed = {}) {
    const {
      user,
      profile,
      dashboard,
      analytics,
      analyticsFailsAtLimit,
      analyticsByGolfer,
      analyticsByCourse,
      playedCourses,
      goalReport,
      benchmarks,
      signedOut,
      scan,
      holdScan,
      reportStorage,
      profileError,
      updateUserError,
      friends,
      accounts,
      verifyTokens,
      resetTokens,
      authErrors,
      ...storeSeed
    } = seed;
    if (holdScan) {
      this.scanHold = new Promise((resolve) => {
        this.releaseScan = resolve;
      });
    }
    this.user = user ?? TEST_USER;
    this.profile = profile;
    this.dashboard = dashboard;
    this.analytics = analytics;
    this.analyticsFailsAtLimit = analyticsFailsAtLimit ?? null;
    this.analyticsByGolfer = analyticsByGolfer ?? {};
    this.analyticsByCourse = analyticsByCourse ?? {};
    this.playedCourses = playedCourses ?? [];
    this.goalReport = goalReport;
    this.benchmarks = benchmarks ?? {};
    this.scan = scan;
    this.reportStorage = reportStorage ?? false;
    this.profileError = profileError ?? null;
    this.updateUserError = updateUserError ?? null;
    this.signedOut = signedOut ?? false;
    this.accounts = accounts ?? { [this.user.email]: { password: "password", verified: true } };
    this.verifyTokens = new Set(verifyTokens);
    this.resetTokens = new Set(resetTokens);
    this.authErrors = authErrors ?? {};
    this.store = new InMemoryRounds(storeSeed);
    this.friendships = new InMemoryFriendships({ ...friends, userId: this.user.user_id });
  }

  private auth(endpoint: FakeAuthEndpoint, body: unknown): FakeReply {
    const limited = this.authErrors[endpoint];
    if (limited) return { status: 429, body: { detail: limited } };
    const fields = (body ?? {}) as Record<string, unknown>;
    const email = String(fields.email ?? "").trim().toLowerCase();
    const token = String(fields.token ?? "");
    const message = (text: string): FakeReply => ({ status: 200, body: { message: text } });

    switch (endpoint) {
      case "login": {
        const account = this.accounts[email];
        if (!account || account.password !== fields.password) {
          return { status: 401, body: { detail: AUTH_MESSAGES.badCredentials } };
        }
        if (!account.verified) return { status: 403, body: { detail: AUTH_MESSAGES.unverified } };
        this.signedOut = false;
        return { status: 200, body: { ...this.user, email, access_token: "fake-token" } };
      }
      case "register": {
        if (this.accounts[email]) return { status: 409, body: { detail: AUTH_MESSAGES.emailTaken } };
        this.registrations.push(fields);
        this.accounts[email] = { password: String(fields.password ?? ""), verified: false };
        return {
          status: 200,
          body: { message: AUTH_MESSAGES.registered, requires_email_verification: true },
        };
      }
      case "resend-verification":
        this.verificationResends.push(email);
        return message(AUTH_MESSAGES.verificationSent);
      case "verify-email":
        if (!this.verifyTokens.delete(token)) {
          return { status: 400, body: { detail: AUTH_MESSAGES.badVerifyToken } };
        }
        this.signedOut = false;
        return message(AUTH_MESSAGES.verified);
      case "forgot-password":
        this.resetRequests.push(email);
        return message(AUTH_MESSAGES.resetSent);
      case "reset-password":
        if (!this.resetTokens.delete(token)) {
          return { status: 400, body: { detail: AUTH_MESSAGES.badResetToken } };
        }
        this.passwordResets.push({ token, new_password: String(fields.new_password ?? "") });
        return message(AUTH_MESSAGES.passwordReset);
    }
  }

  get rounds() {
    return this.store.getRoundsForUser();
  }

  get courses() {
    return this.store.courses;
  }

  scanRequests: Record<string, string>[] = [];

  reportRequests: Record<string, string>[] = [];

  finishScan(): void {
    this.releaseScan?.();
    this.scanHold = null;
  }

  holdGoalReports(): void {
    this.goalReportHold = new Promise((resolve) => {
      this.releaseGoalReports = resolve;
    });
  }

  finishGoalReports(): void {
    this.releaseGoalReports?.();
    this.goalReportHold = null;
  }

  async respond(method: string, url: string, body?: unknown): Promise<FakeReply> {
    if (this.scanHold && method.toUpperCase() === "POST" && url.includes("/api/scan/extract")) {
      await this.scanHold;
    }
    if (this.goalReportHold && method.toUpperCase() === "GET" && url.includes("/goal-report")) {
      await this.goalReportHold;
    }
    return this.handle(method, url, body);
  }

  currentProfile(): UserDto {
    return (
      this.profile ?? {
        id: this.user.user_id,
        name: this.user.name,
        email: this.user.email,
        friend_code: null,
        home_course_id: null,
        handicap: this.store.handicapIndex,
        created_at: null,
        scoring_goal: null,
      }
    );
  }

  handle(method: string, url: string, body?: unknown): FakeReply {
    const verb = method.toUpperCase();
    const parsed = new URL(url, "http://local.test");
    const path = parsed.pathname;

    const authMatch = path.match(
      /\/api\/auth\/(login|register|resend-verification|verify-email|forgot-password|reset-password)$/,
    );
    if (verb === "POST" && authMatch) {
      return this.auth(authMatch[1] as FakeAuthEndpoint, body);
    }

    if (verb === "POST" && path.endsWith("/api/auth/logout")) {
      this.signedOut = true;
      return { status: 200, body: { message: "Logged out." } };
    }

    if (verb === "GET" && path.includes("/api/auth/me")) {
      if (this.signedOut) return { status: 401, body: { detail: "Not authenticated" } };
      return { status: 200, body: this.user };
    }

    if (/\/api\/users\/me\/friends(\/|$)/.test(path)) {
      return this.handleFriends(verb, path, parsed.searchParams, body);
    }

    if (verb === "POST" && path.includes("/api/scan/extract")) {
      this.scanRequests = [...this.scanRequests, (body ?? {}) as Record<string, string>];
      if (!this.scan) {
        return {
          status: 500,
          body: { detail: "Could not read this scorecard.", failure: { category: "extraction_failed", stage: "parse" } },
        };
      }
      return { status: 200, body: this.scan };
    }

    if (verb === "POST" && path.endsWith("/api/scan/reports")) {
      this.reportRequests = [...this.reportRequests, (body ?? {}) as Record<string, string>];
      if (!this.reportStorage) {
        return {
          status: 503,
          body: { code: "report_storage_unavailable", detail: "Reporting is not available yet. Your report was not saved." },
        };
      }
      return { status: 200, body: { status: "saved" } };
    }

    if (verb === "POST" && path.includes("/api/scan/save")) {
      try {
        const id = this.store.saveScan(body as SaveScanRequestDto);
        return { status: 200, body: { id } };
      } catch (err) {
        const detail = err instanceof Error ? err.message : "Could not save this round.";
        return { status: 400, body: { detail } };
      }
    }

    if (verb === "GET" && path.includes("/api/courses/search")) {
      const q = parsed.searchParams.get("q") ?? "";
      try {
        const includeRecord = parsed.searchParams.get("include_record") === "true";
        return { status: 200, body: this.store.searchCourses(q, includeRecord) };
      } catch (err) {
        const detail = err instanceof Error ? err.message : "Could not search courses.";
        return { status: this.store.searchError ? 500 : 404, body: { detail } };
      }
    }

    if (verb === "GET" && /\/api\/courses\/?$/.test(path)) {
      try {
        return { status: 200, body: this.store.getCourses() };
      } catch (err) {
        const detail = err instanceof Error ? err.message : "Could not load courses.";
        return { status: 400, body: { detail } };
      }
    }

    if (verb === "GET" && /\/api\/rounds\/user\//.test(path)) {
      if (this.store.roundsError) return { status: 500, body: { detail: this.store.roundsError } };
      return { status: 200, body: this.store.getRoundsForUser() };
    }

    if (verb === "POST" && /\/api\/rounds\/[^/]+\/link-course/.test(path)) {
      const roundId = path.match(/\/api\/rounds\/([^/]+)\/link-course/)?.[1];
      const courseId =
        typeof body === "object" && body !== null && "course_id" in body
          ? String((body as { course_id: unknown }).course_id)
          : "";
      if (!roundId) return { status: 404, body: { detail: "Round not found." } };
      try {
        return { status: 200, body: this.store.linkCourse(roundId, courseId) };
      } catch (err) {
        const detail = err instanceof Error ? err.message : "Could not link course.";
        const status = this.store.linkError ? 400 : 404;
        return { status, body: { detail } };
      }
    }

    const roundMatch = path.match(/\/api\/rounds\/([^/]+)$/);
    if (roundMatch) {
      const roundId = roundMatch[1];
      if (verb === "GET") {
        try {
          return { status: 200, body: this.store.getRound(roundId) };
        } catch (err) {
          return {
            status: 404,
            body: { detail: err instanceof Error ? err.message : "Round not found." },
          };
        }
      }
      if (verb === "PUT") {
        try {
          return {
            status: 200,
            body: this.store.updateRound(roundId, (body ?? {}) as UpdateRoundBody),
          };
        } catch (err) {
          const detail = err instanceof Error ? err.message : "Could not save this round.";
          const status = this.store.updateError ? 400 : 404;
          return { status, body: { detail } };
        }
      }
      if (verb === "DELETE") {
        try {
          this.store.deleteRound(roundId);
          return { status: 200, body: {} };
        } catch (err) {
          const detail = err instanceof Error ? err.message : "Could not delete this round.";
          const status = this.store.deleteError ? 400 : 404;
          return { status, body: { detail } };
        }
      }
    }

    const courseMatch = path.match(/\/api\/courses\/([^/]+)$/);
    if (verb === "GET" && courseMatch) {
      try {
        return { status: 200, body: this.store.getCourse(courseMatch[1]) };
      } catch (err) {
        return {
          status: 404,
          body: { detail: err instanceof Error ? err.message : "Course not found." },
        };
      }
    }

    if (verb === "GET" && /\/api\/stats\/course-analytics\//.test(path)) {
      const courseId = path.split("/").pop() ?? "";
      if (this.store.courseAnalyticsError) return { status: 500, body: { detail: this.store.courseAnalyticsError } };
      return { status: 200, body: this.store.getCourseAnalytics(courseId) };
    }

    if (verb === "GET" && /\/api\/users\/[^/]+$/.test(path)) {
      if (this.profileError) return { status: 404, body: { detail: this.profileError } };
      return { status: 200, body: this.currentProfile() };
    }

    if (verb === "PATCH" && /\/api\/users\/[^/]+$/.test(path)) {
      if (this.updateUserError) return { status: 400, body: { detail: this.updateUserError } };
      const changes = (body ?? {}) as UserChangesDto;
      const homeCourseId = changes.home_course_id;
      if (homeCourseId) {
        try {
          this.store.getCourse(homeCourseId);
        } catch {
          return { status: 400, body: { detail: "Selected home course was not found" } };
        }
      }
      this.profile = {
        ...this.currentProfile(),
        ...(changes.handicap !== undefined ? { handicap: changes.handicap } : {}),
        ...(homeCourseId !== undefined ? { home_course_id: homeCourseId } : {}),
        ...(changes.scoring_goal !== undefined ? { scoring_goal: changes.scoring_goal } : {}),
      };
      return { status: 200, body: this.profile };
    }

    if (verb === "GET" && /\/api\/stats\/dashboard\/[^/]+$/.test(path)) {
      if (!this.dashboard) {
        return { status: 404, body: { detail: "Dashboard data failed to load." } };
      }
      return { status: 200, body: this.dashboard };
    }

    if (verb === "GET" && /\/api\/stats\/analytics\/[^/]+$/.test(path)) {
      const golfer = this.analyticsByGolfer[path.split("/").pop() ?? ""];
      if (golfer) return { status: 200, body: golfer };
      return this.getAnalytics(parsed.searchParams);
    }

    if (verb === "GET" && /\/api\/stats\/[^/]+\/played-courses$/.test(path)) {
      return { status: 200, body: this.playedCourses };
    }

    if (verb === "GET" && /\/api\/stats\/[^/]+\/goal-report$/.test(path)) {
      if (!this.goalReport) {
        return { status: 404, body: { detail: "No goal report." } };
      }
      return { status: 200, body: this.goalReport };
    }

    if (verb === "GET" && /\/api\/stats\/[^/]+\/benchmark$/.test(path)) {
      const params = parsed.searchParams;
      const against = params.get("against");
      const key =
        against === "handicap"
          ? `handicap:${params.get("handicap")}`
          : against === "friend"
            ? `friend:${params.get("friend_id")}`
            : (against ?? "");
      const found = this.benchmarks[key];
      if (!found) return { status: 422, body: { detail: "No benchmark to compare with." } };
      return { status: 200, body: found };
    }

    if (verb === "GET" && /\/api\/stats\/compare\//.test(path)) {
      return { status: 200, body: this.store.getRoundComparison() };
    }

    return { status: 200, body: [] };
  }

  private getAnalytics(params: URLSearchParams): FakeReply {
    const timeframe = params.get("timeframe");
    const courseId = params.get("course_id") ?? "all";
    this.analyticsRequests.push({
      limit: Number(params.get("limit") ?? 50),
      timeframe: timeframe === "ytd" || timeframe === "1y" ? timeframe : "all",
      courseId,
    });
    if (this.analytics == null) {
      return { status: 404, body: { detail: "Analytics failed to load." } };
    }
    if (this.analyticsFailsAtLimit != null && Number(params.get("limit") ?? 50) === this.analyticsFailsAtLimit) {
      return { status: 500, body: { detail: "Analytics failed to load." } };
    }
    const body = analyticsForCourse(
      {
        analytics: this.analytics,
        byCourse: this.analyticsByCourse,
        homeCourseId: this.currentProfile().home_course_id,
      },
      courseId,
    );
    return { status: 200, body };
  }

  private handleFriends(
    verb: string,
    path: string,
    params: URLSearchParams,
    body: unknown,
  ): FakeReply {
    const field = (name: string) =>
      typeof body === "object" && body !== null && name in body
        ? String((body as Record<string, unknown>)[name])
        : "";
    try {
      if (verb === "GET") {
        const status = params.get("status");
        const rows = this.friendships.list();
        return { status: 200, body: status ? rows.filter((r) => r.status === status) : rows };
      }
      if (verb === "POST") {
        return { status: 201, body: this.friendships.send(field("addressee_friend_code")) };
      }
      const friendshipId = path.match(/\/api\/users\/me\/friends\/([^/]+)$/)?.[1];
      if (verb === "PATCH" && friendshipId) {
        const answer = field("status") as FriendshipAnswer;
        return { status: 200, body: this.friendships.respond(friendshipId, answer) };
      }
      return { status: 405, body: { detail: "Method not allowed" } };
    } catch (err) {
      if (err instanceof FakeHttpError) return { status: err.status, body: { detail: err.message } };
      throw err;
    }
  }
}
