import { describe, expect, it } from "vitest";
import { needsSignIn, returnPathFrom, signInReturnFor } from "../signInReturnModel";

describe("needsSignIn", () => {
  it("is true for the app's sections and the pages under them", () => {
    expect(needsSignIn("/rounds")).toBe(true);
    expect(needsSignIn("/rounds/round-3")).toBe(true);
    expect(needsSignIn("/courses/course-1")).toBe(true);
    expect(needsSignIn("/settings")).toBe(true);
  });

  it("is false for home, the auth screens and paths that only share a prefix", () => {
    expect(needsSignIn("/")).toBe(false);
    expect(needsSignIn("/login")).toBe(false);
    expect(needsSignIn("/register")).toBe(false);
    expect(needsSignIn("/roundsabc")).toBe(false);
    expect(needsSignIn("/no-such-page")).toBe(false);
  });
});

describe("signInReturnFor", () => {
  it("keeps the query and hash", () => {
    expect(signInReturnFor({ pathname: "/rounds/round-3", search: "?edit=1", hash: "#hole-7" })).toEqual({
      from: "/rounds/round-3?edit=1#hole-7",
    });
  });

  it("reads a bare path", () => {
    expect(signInReturnFor({ pathname: "/analytics" })).toEqual({ from: "/analytics" });
  });
});

describe("returnPathFrom", () => {
  it("returns an app page handed over by the redirect", () => {
    expect(returnPathFrom({ from: "/rounds/round-3" })).toBe("/rounds/round-3");
    expect(returnPathFrom({ from: "/analytics?course=c1#putting" })).toBe("/analytics?course=c1#putting");
  });

  it("ignores state that carries no page, or something else", () => {
    expect(returnPathFrom(null)).toBeNull();
    expect(returnPathFrom(undefined)).toBeNull();
    expect(returnPathFrom("/rounds")).toBeNull();
    expect(returnPathFrom({ email: "a@example.com", flash: "Password reset" })).toBeNull();
    expect(returnPathFrom({ from: 42 })).toBeNull();
  });

  it("never leaves the site", () => {
    expect(returnPathFrom({ from: "https://example.com/rounds" })).toBeNull();
    expect(returnPathFrom({ from: "//example.com/rounds" })).toBeNull();
    expect(returnPathFrom({ from: "/\\example.com/rounds" })).toBeNull();
  });

  it("never returns to an auth screen or a page outside the app", () => {
    expect(returnPathFrom({ from: "/login" })).toBeNull();
    expect(returnPathFrom({ from: "/" })).toBeNull();
    expect(returnPathFrom({ from: "/no-such-page" })).toBeNull();
  });
});
