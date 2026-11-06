import { expect } from "@playwright/test";
import { AUTH_MESSAGES } from "../../../../testing/fakes/FakeAuth";
import { RESET_TOKEN, test } from "./ResetPasswordPage.robot";

test("a new password is set and sign-in says so", async ({ reset }) => {
  await reset.open();
  await reset.choose("birdie123");
  await reset.seesNotice(AUTH_MESSAGES.passwordReset);
  expect(reset.backend?.passwordResets).toEqual([{ token: RESET_TOKEN, new_password: "birdie123" }]);

  await reset.continueToSignIn();
  await reset.seesHeading("Sign in");
  await reset.isAt("/login");
  await reset.seesNotice(AUTH_MESSAGES.passwordReset);
});

test("a short, mismatched password is caught before anything is sent", async ({ reset }) => {
  await reset.open();
  await reset.choose("short", "other");
  await reset.seesFieldError("Password must be at least 8 characters.");
  await reset.seesFieldError("Passwords do not match.");
  expect(reset.backend?.passwordResets).toEqual([]);
});

test("an expired link is refused and says why", async ({ reset }) => {
  await reset.open("expired-token");
  await reset.choose("birdie123");
  await reset.seesError(AUTH_MESSAGES.badResetToken);
});
