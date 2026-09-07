import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchWithUserFacingError,
  getUserFacingError,
  parseJsonResponse,
  USER_FACING_ERRORS,
} from "./userFacingErrors";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("fetchWithUserFacingError", () => {
  it("hides network failure details", async () => {
    const networkError = "getaddrinfo ENOTFOUND internal-api.example";
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error(networkError)));

    await expect(
      fetchWithUserFacingError("/api/scan", undefined, USER_FACING_ERRORS.scan),
    ).rejects.toThrow(USER_FACING_ERRORS.scan);

    try {
      await fetchWithUserFacingError("/api/scan", undefined, USER_FACING_ERRORS.scan);
    } catch (error) {
      expect((error as Error).message).not.toContain(networkError);
    }
  });
});

describe("getUserFacingError", () => {
  it("preserves controlled client error details", async () => {
    const response = Response.json(
      { detail: "That score is outside the allowed range." },
      { status: 422 },
    );

    await expect(getUserFacingError(response)).resolves.toBe(
      "That score is outside the allowed range.",
    );
  });

  it("hides server error details", async () => {
    const internalDetail = "relation users.rounds does not exist; password=secret";
    const response = Response.json({ detail: internalDetail }, { status: 500 });

    const message = await getUserFacingError(response, USER_FACING_ERRORS.saveRound);

    expect(message).toBe(USER_FACING_ERRORS.saveRound);
    expect(message).not.toContain("users.rounds");
    expect(message).not.toContain("secret");
  });

  it.each([
    ["plain text", "upstream connection refused"],
    ["HTML", "<html><body>proxy error</body></html>"],
  ])("replaces %s client error bodies", async (_label, body) => {
    const response = new Response(body, { status: 400 });

    await expect(getUserFacingError(response)).resolves.toBe(USER_FACING_ERRORS.request);
  });

  it("replaces empty and structured details", async () => {
    const emptyResponse = new Response(null, { status: 404 });
    const structuredResponse = Response.json(
      { detail: [{ message: "internal validator shape" }] },
      { status: 422 },
    );

    await expect(getUserFacingError(emptyResponse)).resolves.toBe(USER_FACING_ERRORS.request);
    await expect(getUserFacingError(structuredResponse)).resolves.toBe(USER_FACING_ERRORS.request);
  });
});

describe("parseJsonResponse", () => {
  it("returns valid JSON payloads", async () => {
    const response = Response.json({ id: "round-1" });

    await expect(parseJsonResponse<{ id: string }>(response)).resolves.toEqual({ id: "round-1" });
  });

  it("uses safe fallback text for malformed payloads", async () => {
    const response = new Response("<html>deployment details</html>");

    await expect(
      parseJsonResponse(response, USER_FACING_ERRORS.account),
    ).rejects.toThrow(USER_FACING_ERRORS.account);
  });
});
