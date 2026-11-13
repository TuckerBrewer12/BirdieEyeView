import { AUTH_MESSAGES } from "../../../../testing/fakes/FakeAuth";
import { test } from "./ForgotPasswordPage.robot";

test("forgot password", async ({ forgot }) => {
  await forgot.open();
  await forgot.seesHeading("Reset password");
  await forgot.capture("forgot-password.png");
});

test("forgot password in dark mode", async ({ forgot }) => {
  await forgot.dark();
  await forgot.open();
  await forgot.seesHeading("Reset password");
  await forgot.capture("forgot-password-dark.png");
});

test("link sent", async ({ forgot }) => {
  await forgot.open();
  await forgot.requestLink("sam@example.com");
  await forgot.seesNotice(AUTH_MESSAGES.resetSent);
  await forgot.capture("forgot-password-sent.png");
});
