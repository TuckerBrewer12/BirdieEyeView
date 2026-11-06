import { describe, expect, it } from "vitest";
import { hasErrors, isUnverifiedSignIn, newPasswordErrors } from "../authModel";

describe("newPasswordErrors", () => {
  it("passes a long enough password typed the same twice", () => {
    expect(newPasswordErrors("birdie123", "birdie123")).toEqual({ password: null, confirm: null });
  });

  it("names each field's problem", () => {
    expect(newPasswordErrors("short", "shorts")).toEqual({
      password: "Password must be at least 8 characters.",
      confirm: "Passwords do not match.",
    });
  });
});

describe("hasErrors", () => {
  it("is true when any field has a message", () => {
    expect(hasErrors({ a: null, b: null })).toBe(false);
    expect(hasErrors({ a: null, b: "No." })).toBe(true);
  });
});

describe("isUnverifiedSignIn", () => {
  it("spots the server's unverified refusal, and nothing else", () => {
    expect(isUnverifiedSignIn("Email not verified. Please verify your email before signing in.")).toBe(true);
    expect(isUnverifiedSignIn("Invalid email or password")).toBe(false);
    expect(isUnverifiedSignIn(null)).toBe(false);
  });
});
