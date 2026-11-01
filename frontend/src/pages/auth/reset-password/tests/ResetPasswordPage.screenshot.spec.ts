import { AUTH_MESSAGES } from "../../../../testing/fakes/FakeAuth";
import { test } from "./ResetPasswordPage.robot";

test("reset password", async ({ reset }) => {
  await reset.open();
  await reset.capture("reset-password.png");
});

test("reset password in dark mode", async ({ reset }) => {
  await reset.dark();
  await reset.open();
  await reset.capture("reset-password-dark.png");
});

test("link without a token", async ({ reset }) => {
  await reset.open(null);
  await reset.seesError("Missing reset token");
  await reset.capture("reset-password-missing-token.png");
});

test("password reset", async ({ reset }) => {
  await reset.open();
  await reset.choose("birdie123");
  await reset.seesNotice(AUTH_MESSAGES.passwordReset);
  await reset.capture("reset-password-done.png");
});
