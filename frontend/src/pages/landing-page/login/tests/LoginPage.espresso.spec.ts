import { expect } from "@playwright/test";
import { test } from "./LoginPage.robot";

const UNVERIFIED = { "new@example.com": { password: "password", verified: false } };

test("the right credentials sign in and leave the page", async ({ login }) => {
  await login.open();
  await login.signIn("test@example.com", "password");
  await login.isSignedIn();
});

test("a wrong password stays here and says why, with no resend offer", async ({ login }) => {
  await login.open();
  await login.signIn("test@example.com", "nope");
  await login.seesError("Invalid email or password");
  await login.doesNotSeeResend();
});

test("an unverified account can ask for the link again", async ({ login }) => {
  await login.open({ accounts: UNVERIFIED });
  await login.signIn("new@example.com", "password");
  await login.seesError("Email not verified");
  await login.tapResend();
  await login.seesStatus("a verification email has been sent");
  expect(login.backend?.verificationResends).toEqual(["new@example.com"]);
});

test("the reveal button shows the password", async ({ login }) => {
  await login.open();
  await login.typePassword("hunter2");
  await login.revealPassword();
  await login.seesPasswordShown();
});

test("arriving from another page carries its email and message", async ({ login }) => {
  await login.open({}, { email: "new@example.com", flash: "Password updated. Sign in with your new one." });
  await login.seesEmail("new@example.com");
  await login.seesStatus("Password updated");
});
