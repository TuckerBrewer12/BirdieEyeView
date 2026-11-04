import { expect } from "@playwright/test";
import { AUTH_MESSAGES } from "../../../../testing/fakes/FakeAuth";
import { test } from "./LoginPage.robot";

const UNVERIFIED = { "new@example.com": { password: "birdie123", verified: false } };

test("the right credentials sign in and leave the page", async ({ login }) => {
  await login.open();
  await login.revealPassword();
  await login.seesPasswordShown();
  await login.signIn("test@example.com", "password");
  await login.isSignedIn();
});

test("a wrong password stays here and says why, with no resend offer", async ({ login }) => {
  await login.open();
  await login.signIn("test@example.com", "nope");
  await login.seesError(AUTH_MESSAGES.badCredentials);
  await login.doesNotSeeResend();
  await login.isAt("/login");
});

test("an unverified account can ask for the link again", async ({ login }) => {
  await login.open({ accounts: UNVERIFIED });
  await login.signIn("new@example.com", "birdie123");
  await login.seesError("Email not verified");
  await login.tapResend();
  await login.seesNotice(AUTH_MESSAGES.verificationSent);
  expect(login.backend?.verificationResends).toEqual(["new@example.com"]);
});

test("a refused resend says why and stays on the sign-in form", async ({ login }) => {
  const limited = "Too many verification resend attempts. Please try again later.";
  await login.open({ accounts: UNVERIFIED, authErrors: { "resend-verification": limited } });
  await login.signIn("new@example.com", "birdie123");
  await login.tapResend();
  await login.seesError(limited);
  await login.isAt("/login");
});

test("arriving from another screen carries its email and message", async ({ login }) => {
  await login.arriveWith({ email: "new@example.com", flash: AUTH_MESSAGES.passwordReset });
  await login.seesEmail("new@example.com");
  await login.seesNotice(AUTH_MESSAGES.passwordReset);
});

test("a link into the app while signed out signs in first, then opens that page", async ({ login }) => {
  await login.arriveFrom("/courses?from=link#top");
  await login.isAt("/login");
  await login.signIn("test@example.com", "password");
  await login.isSignedInAt("/courses?from=link#top");
});

test("a wrong password keeps the page to come back to", async ({ login }) => {
  await login.arriveFrom("/settings");
  await login.signIn("test@example.com", "nope");
  await login.seesError(AUTH_MESSAGES.badCredentials);
  await login.signIn("test@example.com", "password");
  await login.isSignedInAt("/settings");
});
