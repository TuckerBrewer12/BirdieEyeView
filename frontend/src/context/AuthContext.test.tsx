import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { USER_FACING_ERRORS } from "@/lib/userFacingErrors";
import { useAuth } from "./auth";
import { AuthProvider } from "./AuthContext";

const TOKEN_KEY = "bev_access_token";

const PLAYER = {
  user_id: "u-1",
  name: "Tucker",
  email: "tucker@example.com",
  email_verified: true,
};

interface Sent {
  url: string;
  method: string;
  body: unknown;
  authorization: string | null;
}

type Answer = Response | Error;

class FakeAuthServer {
  readonly sent: Sent[] = [];
  private answers = new Map<string, Answer[]>();
  me: Answer = json(401, { detail: "Not authenticated" });

  answer(path: string, response: Answer): this {
    const queue = this.answers.get(path) ?? [];
    queue.push(response);
    this.answers.set(path, queue);
    return this;
  }

  fetch: typeof fetch = async (input, init) => {
    const url = String(input);
    const headers = new Headers(init?.headers);
    this.sent.push({
      url,
      method: init?.method ?? "GET",
      body: typeof init?.body === "string" ? JSON.parse(init.body) : undefined,
      authorization: headers.get("Authorization"),
    });
    const path = url.replace(/^.*\/api\/auth/, "");
    const queued = this.answers.get(path)?.shift();
    const answer = queued ?? (path === "/me" ? this.me : json(200, { message: "ok" }));
    if (answer instanceof Error) throw answer;
    return answer.clone();
  };

  posts(path: string): Sent[] {
    return this.sent.filter((s) => s.method === "POST" && s.url.endsWith(`/api/auth${path}`));
  }

  sessionChecks(): number {
    return this.sent.filter((s) => s.url.endsWith("/api/auth/me")).length;
  }
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function renderAuth() {
  const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;
  const renders = { count: 0 };
  const view = renderHook(
    () => {
      renders.count++;
      return useAuth();
    },
    { wrapper },
  );
  await waitFor(() => expect(view.result.current.loading).toBe(false));
  return { ...view, renders };
}

describe("AuthProvider", () => {
  let server: FakeAuthServer;

  beforeEach(() => {
    server = new FakeAuthServer();
    vi.stubGlobal("fetch", server.fetch);
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  describe("on load", () => {
    it("signs the player back in from the session", async () => {
      server.me = json(200, PLAYER);
      localStorage.setItem(TOKEN_KEY, "tok-1");

      const { result } = await renderAuth();

      expect(result.current).toMatchObject({
        userId: "u-1",
        name: "Tucker",
        email: "tucker@example.com",
        emailVerified: true,
      });
      expect(server.sent[0].authorization).toBe("Bearer tok-1");
    });

    it("treats a missing email_verified as unverified", async () => {
      server.me = json(200, { ...PLAYER, email_verified: undefined });

      const { result } = await renderAuth();

      expect(result.current.userId).toBe("u-1");
      expect(result.current.emailVerified).toBe(false);
    });

    it.each([401, 403])("is signed out and drops the token on a %i", async (status) => {
      server.me = json(status, { detail: "Not authenticated" });
      localStorage.setItem(TOKEN_KEY, "stale");

      const { result } = await renderAuth();

      expect(result.current).toMatchObject({
        userId: null,
        name: null,
        email: null,
        emailVerified: false,
      });
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    });

    it("stays signed out, keeping the token, when the server can't be reached", async () => {
      server.me = new TypeError("Failed to fetch");
      localStorage.setItem(TOKEN_KEY, "tok-1");

      const { result } = await renderAuth();

      expect(result.current.userId).toBeNull();
      expect(localStorage.getItem(TOKEN_KEY)).toBe("tok-1");
    });
  });

  describe("refreshSession", () => {
    it("returns who is signed in", async () => {
      server.me = json(200, PLAYER);
      const { result } = await renderAuth();

      let session: Awaited<ReturnType<typeof result.current.refreshSession>> = null;
      await act(async () => {
        session = await result.current.refreshSession();
      });

      expect(session).toEqual({
        userId: "u-1",
        name: "Tucker",
        email: "tucker@example.com",
        emailVerified: true,
      });
    });

    it("picks up a change made elsewhere", async () => {
      server.me = json(200, { ...PLAYER, email_verified: false });
      const { result } = await renderAuth();
      expect(result.current.emailVerified).toBe(false);

      server.me = json(200, { ...PLAYER, name: "T. Brewer", email_verified: true });
      await act(() => result.current.refreshSession());

      expect(result.current.name).toBe("T. Brewer");
      expect(result.current.emailVerified).toBe(true);
    });

    it.each([
      ["signed in", json(200, PLAYER)],
      ["signed out", json(401, { detail: "Not authenticated" })],
    ])("doesn't re-render when the session is unchanged while %s", async (_name, me) => {
      server.me = me;
      const { result, renders } = await renderAuth();
      const before = renders.count;

      await act(() => result.current.refreshSession());

      expect(renders.count).toBe(before);
    });

    it.each([
      ["a network error", () => new TypeError("Failed to fetch")],
      ["a server error", () => json(500, { detail: "boom" })],
    ])("keeps a signed-in player signed in through %s", async (_name, failure) => {
      server.me = json(200, PLAYER);
      const { result } = await renderAuth();

      server.me = failure();
      let session: Awaited<ReturnType<typeof result.current.refreshSession>> = null;
      await act(async () => {
        session = await result.current.refreshSession();
      });

      expect(session).toMatchObject({ userId: "u-1" });
      expect(result.current.userId).toBe("u-1");
    });

    it("returns null through an error when nobody is signed in", async () => {
      const { result } = await renderAuth();

      server.me = json(500, { detail: "boom" });
      let session: Awaited<ReturnType<typeof result.current.refreshSession>> = undefined as never;
      await act(async () => {
        session = await result.current.refreshSession();
      });

      expect(session).toBeNull();
    });

    it("signs the player out when the session has ended", async () => {
      server.me = json(200, PLAYER);
      localStorage.setItem(TOKEN_KEY, "tok-1");
      const { result } = await renderAuth();

      server.me = json(401, { detail: "Not authenticated" });
      let session: Awaited<ReturnType<typeof result.current.refreshSession>> = undefined as never;
      await act(async () => {
        session = await result.current.refreshSession();
      });

      expect(session).toBeNull();
      expect(result.current.userId).toBeNull();
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    });

    it("runs again when the tab comes back into focus or view", async () => {
      await renderAuth();
      const before = server.sessionChecks();

      await act(async () => {
        window.dispatchEvent(new Event("focus"));
      });
      await act(async () => {
        document.dispatchEvent(new Event("visibilitychange"));
      });

      await waitFor(() => expect(server.sessionChecks()).toBe(before + 2));
    });
  });

  describe("login", () => {
    it("stores the token and signs the player in", async () => {
      const { result } = await renderAuth();
      server.answer("/login", json(200, { ...PLAYER, access_token: "tok-new" }));

      await act(() => result.current.login("tucker@example.com", "pw"));

      expect(server.posts("/login")[0].body).toEqual({ email: "tucker@example.com", password: "pw" });
      expect(localStorage.getItem(TOKEN_KEY)).toBe("tok-new");
      expect(result.current).toMatchObject({ userId: "u-1", name: "Tucker", emailVerified: true });
    });

    it("clears any old token when the server sends none", async () => {
      localStorage.setItem(TOKEN_KEY, "old");
      const { result } = await renderAuth();
      server.answer("/login", json(200, { ...PLAYER, access_token: null }));

      await act(() => result.current.login("tucker@example.com", "pw"));

      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
      expect(result.current.userId).toBe("u-1");
    });

    it("rejects with the server's reason and stays signed out", async () => {
      const { result } = await renderAuth();
      server.answer("/login", json(401, { detail: "Invalid email or password" }));

      await expect(result.current.login("tucker@example.com", "bad")).rejects.toThrow(
        "Invalid email or password",
      );
      expect(result.current.userId).toBeNull();
    });

    it.each([
      ["the server fails", () => json(500, { detail: "Traceback..." })],
      ["the server can't be reached", () => new TypeError("Failed to fetch")],
      ["the answer isn't JSON", () => new Response("<html>", { status: 200 })],
    ])("rejects with the account fallback when %s", async (_name, failure) => {
      const { result } = await renderAuth();
      server.answer("/login", failure());

      await expect(result.current.login("tucker@example.com", "pw")).rejects.toThrow(
        USER_FACING_ERRORS.account,
      );
    });
  });

  describe("account calls", () => {
    it("register sends the name, email and password and returns the server's message", async () => {
      const { result } = await renderAuth();
      server.answer("/register", json(200, { message: "Account created." }));

      let message = "";
      await act(async () => {
        message = await result.current.register("Tucker", "tucker@example.com", "pw");
      });

      expect(message).toBe("Account created.");
      expect(server.posts("/register")[0].body).toEqual({
        name: "Tucker",
        email: "tucker@example.com",
        password: "pw",
      });
      expect(result.current.userId).toBeNull();
    });

    it("sends each call to its endpoint and returns the server's message", async () => {
      const { result } = await renderAuth();
      server
        .answer("/resend-verification", json(200, { message: "sent" }))
        .answer("/forgot-password", json(200, { message: "reset sent" }))
        .answer("/reset-password", json(200, { message: "reset" }));

      const messages: string[] = [];
      await act(async () => {
        messages.push(await result.current.resendVerification("a@b.c"));
        messages.push(await result.current.forgotPassword("a@b.c"));
        messages.push(await result.current.resetPassword("tok", "new-pw"));
      });

      expect(messages).toEqual(["sent", "reset sent", "reset"]);
      expect(server.posts("/resend-verification")[0].body).toEqual({ email: "a@b.c" });
      expect(server.posts("/forgot-password")[0].body).toEqual({ email: "a@b.c" });
      expect(server.posts("/reset-password")[0].body).toEqual({ token: "tok", new_password: "new-pw" });
    });

    it("verifyEmail checks the session afterwards", async () => {
      const { result } = await renderAuth();
      server.answer("/verify-email", json(200, { message: "verified" }));
      server.me = json(200, PLAYER);

      let message = "";
      await act(async () => {
        message = await result.current.verifyEmail("tok");
      });

      expect(message).toBe("verified");
      expect(server.posts("/verify-email")[0].body).toEqual({ token: "tok" });
      expect(result.current.userId).toBe("u-1");
    });

    it("a failed call rejects with the server's reason", async () => {
      const { result } = await renderAuth();
      server.answer("/reset-password", json(400, { detail: "Invalid or expired reset token" }));

      await expect(result.current.resetPassword("bad", "pw")).rejects.toThrow(
        "Invalid or expired reset token",
      );
    });
  });

  describe("logout", () => {
    it("signs the player out and drops the token", async () => {
      server.me = json(200, PLAYER);
      localStorage.setItem(TOKEN_KEY, "tok-1");
      const { result } = await renderAuth();

      await act(() => result.current.logout());

      expect(server.posts("/logout")).toHaveLength(1);
      expect(result.current.userId).toBeNull();
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    });

    it("signs the player out even when the server call fails, and still rejects", async () => {
      server.me = json(200, PLAYER);
      localStorage.setItem(TOKEN_KEY, "tok-1");
      const { result } = await renderAuth();
      server.answer("/logout", json(500, {}));

      await act(async () => {
        await expect(result.current.logout()).rejects.toThrow(USER_FACING_ERRORS.account);
      });

      expect(result.current.userId).toBeNull();
      expect(localStorage.getItem(TOKEN_KEY)).toBeNull();
    });
  });
});
