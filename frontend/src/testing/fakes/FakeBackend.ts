import { InMemoryRounds, type InMemoryRoundsSeed } from "./InMemoryRounds";
import {
  FakeHttpError,
  InMemoryFriendships,
  type InMemoryFriendshipsSeed,
} from "./InMemoryFriendships";
import type { FriendshipAnswer } from "../../pages/social/friendsModel";
import type { UpdateRoundBody } from "../../pages/rounds/roundsRepository";
import type { DashboardData, User } from "../../types/golf";
import type { AnalyticsData, GoalReport } from "../../types/analytics";
import type { ScanResult } from "../../types/scan";

export const TEST_USER = {
  user_id: "user-1",
  name: "Test Golfer",
  email: "test@example.com",
  email_verified: true,
};

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
  /** `/api/users/me/friends`: the golfer's friendships and who a friend code finds. */
  friends?: Omit<InMemoryFriendshipsSeed, "userId">;
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
  readonly signedOut: boolean;
  readonly store: InMemoryRounds;
  readonly friendships: InMemoryFriendships;

  constructor(seed: FakeBackendSeed = {}) {
    const { user, profile, dashboard, analytics, goalReport, signedOut, scan, friends, ...storeSeed } =
      seed;
    this.user = user ?? TEST_USER;
    this.profile = profile;
    this.dashboard = dashboard;
    this.analytics = analytics;
    this.goalReport = goalReport;
    this.scan = scan;
    this.signedOut = signedOut ?? false;
    this.store = new InMemoryRounds(storeSeed);
    this.friendships = new InMemoryFriendships({ ...friends, userId: this.user.user_id });
  }

  get rounds() {
    return this.store.getRoundsForUser();
  }

  get courses() {
    return this.store.courses;
  }

  handle(method: string, url: string, body?: unknown): FakeReply {
    const verb = method.toUpperCase();
    const parsed = new URL(url, "http://local.test");
    const path = parsed.pathname;

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
      if (this.profile) return { status: 200, body: this.profile };
      return {
        status: 200,
        body: {
          id: this.user.user_id,
          name: this.user.name,
          email: this.user.email,
          home_course_id: null,
          handicap: this.store.handicapIndex,
          created_at: null,
          scoring_goal: null,
        } satisfies User,
      };
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
