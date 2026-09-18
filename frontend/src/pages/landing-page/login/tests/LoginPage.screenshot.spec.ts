import { test } from "./LoginPage.robot";

const UNVERIFIED = { "new@example.com": { password: "password", verified: false } };

test("sign in", async ({ login }) => {
  await login.open();
  await login.capture("login.png");
});

test("sign in in dark mode", async ({ login }) => {
  await login.dark();
  await login.open();
  await login.capture("login-dark.png");
});

test("wrong password", async ({ login }) => {
  await login.open();
  await login.signIn("test@example.com", "nope");
  await login.seesError("Invalid email or password");
  await login.capture("login-error.png");
});

test("unverified account offers a resend", async ({ login }) => {
  await login.open({ accounts: UNVERIFIED });
  await login.signIn("new@example.com", "password");
  await login.seesError("Email not verified");
  await login.capture("login-unverified.png");
});
