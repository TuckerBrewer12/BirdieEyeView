import { InMemoryRounds, type InMemoryRoundsSeed } from "./InMemoryRounds";
import type { UpdateRoundBody } from "../../pages/rounds/roundsRepository";

export const TEST_USER = {
  user_id: "user-1",
  name: "Test Golfer",
  email: "test@example.com",
  email_verified: true,
};

export interface FakeBackendSeed extends InMemoryRoundsSeed {
  user?: typeof TEST_USER;
}

export interface FakeReply {
  status: number;
  body: unknown;
}

/** Points HTTP at InMemoryRounds. Same store FakeRoundsRepository uses. */
export class FakeBackend {
  user: typeof TEST_USER;
  readonly store: InMemoryRounds;

  constructor(seed: FakeBackendSeed = {}) {
    const { user, ...storeSeed } = seed;
    this.user = user ?? TEST_USER;
    this.store = new InMemoryRounds(storeSeed);
  }

  get rounds() {
    return this.store.rounds;
  }

  get courses() {
    return this.store.courses;
  }

  handle(method: string, url: string, body?: unknown): FakeReply {
    const verb = method.toUpperCase();
    const parsed = new URL(url, "http://local.test");
    const path = parsed.pathname;

    if (verb === "GET" && path.includes("/api/auth/me")) {
      return { status: 200, body: this.user };
    }

    if (verb === "GET" && path.includes("/api/courses/search")) {
      const q = parsed.searchParams.get("q") ?? "";
      return { status: 200, body: this.store.searchCourses(q) };
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

    if (verb === "GET" && /\/api\/stats\/compare\//.test(path)) {
      return { status: 200, body: this.store.getRoundComparison() };
    }

    return { status: 200, body: [] };
  }
}
