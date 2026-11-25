import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "./api";
import { configureSessionStorage, setSessionToken, type TokenStorage } from "./sessionToken";
import { USER_FACING_ERRORS } from "./userFacingErrors";

interface SentRequest {
  url: string;
  method: string;
  credentials: RequestCredentials | undefined;
  headers: Headers;
  body: unknown;
}

class FakeApiTransport {
  readonly sent: SentRequest[] = [];
  reply: () => Response = () => Response.json({ ok: true });

  constructor() {
    vi.stubGlobal("fetch", this.send);
  }

  answer(status: number, body: unknown): this {
    this.reply = () => Response.json(body, { status });
    return this;
  }

  answerText(status: number, text: string): this {
    this.reply = () => new Response(text, { status });
    return this;
  }

  answerEmpty(status: number): this {
    this.reply = () => new Response(null, { status });
    return this;
  }

  goOffline(): this {
    this.reply = () => {
      throw new TypeError("Failed to fetch: getaddrinfo ENOTFOUND api.internal");
    };
    return this;
  }

  get last(): SentRequest {
    const request = this.sent.at(-1);
    if (!request) throw new Error("no request was sent");
    return request;
  }

  private send: typeof fetch = async (input, init) => {
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : init?.body;
    this.sent.push({
      url: String(input),
      method: init?.method ?? "GET",
      credentials: init?.credentials,
      headers: new Headers(init?.headers),
      body,
    });
    return this.reply();
  };
}

class MemoryTokenStorage implements TokenStorage {
  private readonly items = new Map<string, string>();
  getItem(key: string) {
    return this.items.get(key) ?? null;
  }
  setItem(key: string, value: string) {
    this.items.set(key, value);
  }
  removeItem(key: string) {
    this.items.delete(key);
  }
}

let transport: FakeApiTransport;

beforeEach(() => {
  transport = new FakeApiTransport();
  configureSessionStorage(new MemoryTokenStorage());
  setSessionToken("token-123");
});

afterEach(() => {
  vi.unstubAllGlobals();
  configureSessionStorage(null);
});

interface Call {
  name: string;
  call: () => Promise<unknown>;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  url: string;
  body?: unknown;
}

const CALLS: Call[] = [
  { name: "getDashboard", call: () => api.getDashboard("u1"), method: "GET", url: "/api/stats/dashboard/u1" },
  {
    name: "getRoundsForUser",
    call: () => api.getRoundsForUser("u1"),
    method: "GET",
    url: "/api/rounds/user/u1?limit=100&offset=0",
  },
  {
    name: "getRoundsForUser, a later page",
    call: () => api.getRoundsForUser("u1", 20, 40),
    method: "GET",
    url: "/api/rounds/user/u1?limit=20&offset=40",
  },
  { name: "getRound", call: () => api.getRound("r1"), method: "GET", url: "/api/rounds/r1" },
  {
    name: "updateRound",
    call: () =>
      api.updateRound("r1", {
        hole_scores: [{ hole_number: 3, strokes: 5, putts: null }],
        tee_box: "Blue",
        notes: "Windy",
      }),
    method: "PUT",
    url: "/api/rounds/r1",
    body: { hole_scores: [{ hole_number: 3, strokes: 5, putts: null }], tee_box: "Blue", notes: "Windy" },
  },
  {
    name: "linkCourse",
    call: () => api.linkCourse("r1", "c1"),
    method: "POST",
    url: "/api/rounds/r1/link-course",
    body: { course_id: "c1" },
  },
  { name: "getCourses", call: () => api.getCourses(), method: "GET", url: "/api/courses?limit=50&offset=0" },
  {
    name: "getCourses, a golfer's",
    call: () => api.getCourses("u1", 10, 5),
    method: "GET",
    url: "/api/courses?limit=10&offset=5&user_id=u1",
  },
  { name: "searchCourses", call: () => api.searchCourses("pebble"), method: "GET", url: "/api/courses/search?q=pebble" },
  {
    name: "searchCourses, everything",
    call: () => api.searchCourses("pebble beach & co", "u1", true, true),
    method: "GET",
    url: "/api/courses/search?q=pebble+beach+%26+co&user_id=u1&include_external=true&include_record=true",
  },
  { name: "getCourse", call: () => api.getCourse("c1"), method: "GET", url: "/api/courses/c1" },
  { name: "getUser", call: () => api.getUser("u1"), method: "GET", url: "/api/users/u1" },
  {
    name: "updateUser",
    call: () => api.updateUser("u1", { scoring_goal: 89, home_course_id: null }),
    method: "PATCH",
    url: "/api/users/u1",
    body: { scoring_goal: 89, home_course_id: null },
  },
  { name: "getGoalReport", call: () => api.getGoalReport("u1"), method: "GET", url: "/api/stats/u1/goal-report?limit=50" },
  {
    name: "getGoalReport, twenty rounds",
    call: () => api.getGoalReport("u1", 20),
    method: "GET",
    url: "/api/stats/u1/goal-report?limit=20",
  },
  {
    name: "cloneCourse",
    call: () => api.cloneCourse("c1", "u 1"),
    method: "POST",
    url: "/api/courses/c1/clone?user_id=u%201",
    body: {},
  },
  {
    name: "getAnalytics, all rounds",
    call: () => api.getAnalytics("u1", { limit: 20, timeframe: "all", courseId: "all" }),
    method: "GET",
    url: "/api/stats/analytics/u1?limit=20",
  },
  {
    name: "getAnalytics, filtered",
    call: () => api.getAnalytics("u1", { limit: 50, timeframe: "ytd", courseId: "home" }),
    method: "GET",
    url: "/api/stats/analytics/u1?limit=50&timeframe=ytd&course_id=home",
  },
  {
    name: "getBenchmarkComparison, a handicap",
    call: () => api.getBenchmarkComparison("u1", { against: "handicap", handicap: 10 }),
    method: "GET",
    url: "/api/stats/u1/benchmark?against=handicap&limit=20&handicap=10",
  },
  {
    name: "getBenchmarkComparison, a friend",
    call: () => api.getBenchmarkComparison("u1", { against: "friend", friendId: "f1" }, 5),
    method: "GET",
    url: "/api/stats/u1/benchmark?against=friend&limit=5&friend_id=f1",
  },
  { name: "getPlayedCourses", call: () => api.getPlayedCourses("u1"), method: "GET", url: "/api/stats/u1/played-courses" },
  {
    name: "getRoundComparison",
    call: () => api.getRoundComparison("u1", "r1"),
    method: "GET",
    url: "/api/stats/compare/u1/r1",
  },
  {
    name: "getCourseAnalytics",
    call: () => api.getCourseAnalytics("u1", "c1"),
    method: "GET",
    url: "/api/stats/course-analytics/u1/c1",
  },
  { name: "getFriendships", call: () => api.getFriendships(), method: "GET", url: "/api/users/me/friends" },
  {
    name: "getFriendships, pending",
    call: () => api.getFriendships("pending"),
    method: "GET",
    url: "/api/users/me/friends?status=pending",
  },
  {
    name: "sendFriendRequest",
    call: () => api.sendFriendRequest("ABC123"),
    method: "POST",
    url: "/api/users/me/friends",
    body: { addressee_friend_code: "ABC123" },
  },
  {
    name: "updateFriendshipStatus",
    call: () => api.updateFriendshipStatus("fr1", "accepted"),
    method: "PATCH",
    url: "/api/users/me/friends/fr1",
    body: { status: "accepted" },
  },
  {
    name: "saveScan",
    call: () => api.saveScan({ user_id: "u1", course_id: "c1", hole_scores: [{ hole_number: 1, strokes: 4 }] }),
    method: "POST",
    url: "/api/scan/save",
    body: { user_id: "u1", course_id: "c1", hole_scores: [{ hole_number: 1, strokes: 4 }] },
  },
];

const JSON_CALLS = CALLS.filter((c) => c.method !== "DELETE");

describe("each endpoint", () => {
  it.each(CALLS.map((c) => [c.name, c] as const))("%s sends the request the server expects", async (_name, c) => {
    await c.call();

    expect(transport.sent).toHaveLength(1);
    expect(transport.last).toMatchObject({ url: c.url, method: c.method, credentials: "include", body: c.body });
  });

  it.each(CALLS.map((c) => [c.name, c] as const))("%s signs the request with the session", async (_name, c) => {
    await c.call();

    expect(transport.last.headers.get("Authorization")).toBe("Bearer token-123");
  });

  it.each(CALLS.map((c) => [c.name, c] as const))("%s says JSON only when it sends JSON", async (_name, c) => {
    await c.call();

    const contentType = transport.last.headers.get("Content-Type");
    expect(contentType).toBe(c.body === undefined ? null : "application/json");
  });

  it.each(JSON_CALLS.map((c) => [c.name, c] as const))("%s gives back what the server sent", async (_name, c) => {
    transport.answer(200, { id: "x", figures: [1, 2] });

    await expect(c.call()).resolves.toEqual({ id: "x", figures: [1, 2] });
  });

  it("sends no Authorization header without a session", async () => {
    setSessionToken(null);

    await api.getRound("r1");

    expect(transport.last.headers.has("Authorization")).toBe(false);
  });
});

describe("when a request fails", () => {
  const OWN_WORDS: Record<string, string> = {
    saveScan: USER_FACING_ERRORS.saveRound,
  };
  const wordingOf = (c: Call) => OWN_WORDS[c.name] ?? USER_FACING_ERRORS.request;

  it.each(JSON_CALLS.map((c) => [c.name, c] as const))("%s passes on the server's own words", async (_name, c) => {
    transport.answer(404, { detail: "Round not found." });

    await expect(c.call()).rejects.toThrow("Round not found.");
  });

  it.each(JSON_CALLS.map((c) => [c.name, c] as const))("%s hides a server error", async (_name, c) => {
    transport.answer(500, { detail: "relation users.rounds does not exist" });

    await expect(c.call()).rejects.toThrow(wordingOf(c));
  });

  it.each(JSON_CALLS.map((c) => [c.name, c] as const))("%s hides a network failure", async (_name, c) => {
    transport.goOffline();

    await expect(c.call()).rejects.toThrow(wordingOf(c));
  });

  it.each(JSON_CALLS.map((c) => [c.name, c] as const))("%s refuses a reply that isn't JSON", async (_name, c) => {
    transport.answerText(200, "<html>proxy error</html>");

    await expect(c.call()).rejects.toThrow(wordingOf(c));
  });
});

describe("deleteRound", () => {
  it("sends DELETE and resolves with nothing once the round is gone", async () => {
    transport.answerEmpty(204);

    await expect(api.deleteRound("r1")).resolves.toBeUndefined();
    expect(transport.last).toMatchObject({
      url: "/api/rounds/r1",
      method: "DELETE",
      credentials: "include",
      body: undefined,
    });
    expect(transport.last.headers.get("Authorization")).toBe("Bearer token-123");
    expect(transport.last.headers.has("Content-Type")).toBe(false);
  });

  it("doesn't read a body on success", async () => {
    transport.answerText(200, "not json");

    await expect(api.deleteRound("r1")).resolves.toBeUndefined();
  });

  it("passes on the server's own words", async () => {
    transport.answer(403, { detail: "Not your round." });

    await expect(api.deleteRound("r1")).rejects.toThrow("Not your round.");
  });

  it.each([
    ["a server error", (t: FakeApiTransport) => t.answer(500, { detail: "boom" })],
    ["a network failure", (t: FakeApiTransport) => t.goOffline()],
  ])("words %s as the delete failing", async (_name, fail) => {
    fail(transport);

    await expect(api.deleteRound("r1")).rejects.toThrow(USER_FACING_ERRORS.deleteRound);
  });
});
