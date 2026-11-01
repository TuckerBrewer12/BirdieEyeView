import { AUTH_MESSAGES } from "../../../../testing/fakes/FakeAuth";
import { test } from "./LoginPage.robot";

const UNVERIFIED = { "new@example.com": { password: "birdie123", verified: false } };

test("sign in", async ({ login }) => {
  await login.open();
  await login.capture("login.png");
});

test("sign in in dark mode", async ({ login }) => {
  await login.dark();
  await login.open();
  await login.capture("login-dark.png");
});

test("password revealed", async ({ login }) => {
  await login.open();
  await login.typePassword("birdie123");
  await login.revealPassword();
  await login.capture("login-password-revealed.png");
});

test("wrong password", async ({ login }) => {
  await login.open();
  await login.signIn("test@example.com", "nope");
  await login.seesError(AUTH_MESSAGES.badCredentials);
  await login.capture("login-error.png");
});

test("unverified account offered a resend", async ({ login }) => {
  await login.open({ accounts: UNVERIFIED });
  await login.signIn("new@example.com", "birdie123");
  await login.seesError("Email not verified");
  await login.capture("login-unverified.png");
});
