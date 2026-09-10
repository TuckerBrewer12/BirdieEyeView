import type { CourseSummary, RoundSummary } from "../../types/golf";

export const TEST_USER = {
  user_id: "user-1",
  name: "Test Golfer",
  email: "test@example.com",
  email_verified: true,
};

export interface FakeBackendSeed {
  user?: typeof TEST_USER;
  rounds?: RoundSummary[];
  courses?: CourseSummary[];
  /** When set, POST .../link-course returns 400 with this `detail`. */
  linkError?: string | null;
}

export interface FakeReply {
  status: number;
  body: unknown;
}

/** In-memory golf API. Same idea as an Android fake repository — working behavior, no vi.fn. */
export class FakeBackend {
  user: typeof TEST_USER;
  rounds: RoundSummary[];
  courses: CourseSummary[];
  linkError: string | null;

  constructor(seed: FakeBackendSeed = {}) {
    this.user = seed.user ?? TEST_USER;
    this.rounds = (seed.rounds ?? []).map((round) => ({ ...round }));
    this.courses = [...(seed.courses ?? [])];
    this.linkError = seed.linkError ?? null;
  }

  handle(method: string, url: string, body?: unknown): FakeReply {
    const verb = method.toUpperCase();
    const parsed = new URL(url, "http://local.test");
    const path = parsed.pathname;

    if (verb === "GET" && path.includes("/api/auth/me")) {
      return { status: 200, body: this.user };
    }

    if (verb === "GET" && path.includes("/api/courses/search")) {
      const q = parsed.searchParams.get("q")?.toLowerCase() ?? "";
      const hits = this.courses.filter((course) => (course.name ?? "").toLowerCase().includes(q));
      return { status: 200, body: hits };
    }

    if (verb === "GET" && /\/api\/rounds\/user\//.test(path)) {
      return { status: 200, body: this.rounds };
    }

    if (verb === "POST" && /\/api\/rounds\/[^/]+\/link-course/.test(path)) {
      if (this.linkError) {
        return { status: 400, body: { detail: this.linkError } };
      }
      const roundId = path.match(/\/api\/rounds\/([^/]+)\/link-course/)?.[1];
      const courseId =
        typeof body === "object" && body !== null && "course_id" in body
          ? String((body as { course_id: unknown }).course_id)
          : "";
      const course = this.courses.find((c) => c.id === courseId);
      this.rounds = this.rounds.map((round) =>
        round.id === roundId
          ? {
              ...round,
              course_id: courseId,
              course_name: course?.name ?? round.course_name,
              course_location: course?.location ?? round.course_location,
            }
          : round,
      );
      const updated = this.rounds.find((round) => round.id === roundId);
      if (!updated) {
        return { status: 404, body: { detail: "Round not found." } };
      }
      return { status: 200, body: updated };
    }

    return { status: 200, body: [] };
  }
}
