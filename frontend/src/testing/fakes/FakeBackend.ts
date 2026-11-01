import { InMemoryRounds, type InMemoryRoundsSeed } from "./InMemoryRounds";
import {
  FakeHttpError,
  InMemoryFriendships,
  type InMemoryFriendshipsSeed,
} from "./InMemoryFriendships";
import type { FriendshipAnswer } from "../../pages/social/friendsModel";
import type { UpdateRoundBody } from "../../pages/rounds/roundsRepository";
import type { SaveScanRequestDto, UserChangesDto } from "../../types/api";
import type { DashboardData, User } from "../../types/golf";
import type { AnalyticsData, GoalReport } from "../../types/analytics";
import type { ScanResult } from "../../types/scan";
import { AUTH_MESSAGES } from "./FakeAuth";

export const TEST_USER = {
  user_id: "user-1",
  name: "Test Golfer",
  email: "test@example.com",
  email_verified: true,
};

/** An account the fake signs in, keyed by email. */
export interface FakeAccount {
  password: string;
  verified: boolean;
}

/** The auth endpoints a seed can make fail, each with the detail the server would send. */
export type FakeAuthEndpoint =
  | "login"
  | "register"
  | "resend-verification"
  | "verify-email"
  | "forgot-password"
  | "reset-password";

export interface FakeBackendSeed extends InMemoryRoundsSeed {
  user?: typeof TEST_USER;
  profile?: User;
  dashboard?: DashboardData;
  analytics?: AnalyticsData | null;
  goalReport?: GoalReport | null;
  /** No one is signed in — `/api/auth/me` answers 401, as the real API does. */
  signedOut?: boolean;
  /** What `/api/scan/extract` reads off any uploaded card. Unset, extract fails. */
  scan?: ScanResult;
  /** `/api/scan/extract` doesn't answer until `finishScan()`, so the scan can be seen running. */
  holdScan?: boolean;
  /** Why `GET /api/users/{id}` fails; unset, it answers with the profile. */
  profileError?: string | null;
  /** Why `PATCH /api/users/{id}` fails; unset, it saves. */
  updateUserError?: string | null;
  /** `/api/users/me/friends`: the golfer's friendships and who a friend code finds. */
  friends?: Omit<InMemoryFriendshipsSeed, "userId">;
  /** Accounts `/api/auth/login` accepts. Defaults to `TEST_USER` with the password `password`. */
  accounts?: Record<string, FakeAccount>;
  /** Tokens an emailed link may carry: verification and password reset. Each works once. */
  verifyTokens?: string[];
  resetTokens?: string[];
  /** Auth endpoints that answer 429 with this detail, as the rate limiter does. */
  authErrors?: Partial<Record<FakeAuthEndpoint, string>>;
}

export interface FakeReply {
  status: number;
  body: unknown;
}

/** Points HTTP at InMemoryRounds. Same store FakeRoundsRepository uses. */
export class FakeBackend {
  user: typeof TEST_USER;
  profile: User | undefined;
  dashboard: DashboardData | undefined;
  analytics: AnalyticsData | null | undefined;
  goalReport: GoalReport | null | undefined;
  scan: ScanResult | undefined;
  profileError: string | null;
  updateUserError: string | null;
  /** Flips to false when a sign-in or a verification link starts a session. */
  signedOut: boolean;
  readonly accounts: Record<string, FakeAccount>;
  readonly verifyTokens: Set<string>;
  readonly resetTokens: Set<string>;
  readonly authErrors: Partial<Record<FakeAuthEndpoint, string>>;
  /** What each auth endpoint was sent, in order. */
  readonly registrations: Record<string, unknown>[] = [];
  readonly verificationResends: string[] = [];
  readonly resetRequests: string[] = [];
  readonly passwordResets: { token: string; new_password: string }[] = [];
  readonly store: InMemoryRounds;
  readonly friendships: InMemoryFriendships;
  private scanHold: Promise<void> | null = null;
  private releaseScan: (() => void) | null = null;

  constructor(seed: FakeBackendSeed = {}) {
    const {
      user,
      profile,
      dashboard,
      analytics,
      goalReport,
      signedOut,
      scan,
      holdScan,
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
    this.goalReport = goalReport;
    this.scan = scan;
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

  /** Mirrors `api/routers/auth.py`: the same details and status codes, without the mail. */
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
        // The real endpoint sets the session cookie, so the golfer is signed in from here.
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

  /** Lets a held scan answer. */
  finishScan(): void {
    this.releaseScan?.();
    this.scanHold = null;
  }

  /** `handle`, after waiting out a held scan. */
  async respond(method: string, url: string, body?: unknown): Promise<FakeReply> {
    if (this.scanHold && method.toUpperCase() === "POST" && url.includes("/api/scan/extract")) {
      await this.scanHold;
    }
    return this.handle(method, url, body);
  }

  /** The user row `/api/users/{id}` answers with: the seeded profile, or one built from the session. */
  currentProfile(): User {
    return (
      this.profile ?? {
        id: this.user.user_id,
        name: this.user.name,
        email: this.user.email,
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

    if (verb === "GET" && path.includes("/api/auth/me")) {
      if (this.signedOut) return { status: 401, body: { detail: "Not authenticated" } };
      return { status: 200, body: this.user };
    }

    if (/\/api\/users\/me\/friends(\/|$)/.test(path)) {
      return this.handleFriends(verb, path, parsed.searchParams, body);
    }

    if (verb === "POST" && path.includes("/api/scan/extract")) {
      if (!this.scan) return { status: 500, body: { detail: "Could not read this scorecard." } };
      return { status: 200, body: this.scan };
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
        return { status: 200, body: this.store.searchCourses(q) };
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

    if (verb === "GET" && /\/api\/users\/[^/]+\/handicap$/.test(path)) {
      return { status: 200, body: this.store.getUserHandicap() };
    }

    if (verb === "GET" && /\/api\/stats\/course-analytics\//.test(path)) {
      const courseId = path.split("/").pop() ?? "";
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
      if (this.analytics == null) {
        return { status: 404, body: { detail: "Analytics failed to load." } };
      }
      return { status: 200, body: this.analytics };
    }

    if (verb === "GET" && /\/api\/stats\/[^/]+\/goal-report$/.test(path)) {
      if (!this.goalReport) {
        return { status: 404, body: { detail: "No goal report." } };
      }
      return { status: 200, body: this.goalReport };
    }

    if (verb === "GET" && /\/api\/stats\/compare\//.test(path)) {
      return { status: 200, body: this.store.getRoundComparison() };
    }

    return { status: 200, body: [] };
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
