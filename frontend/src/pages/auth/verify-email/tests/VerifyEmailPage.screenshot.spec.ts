import { AUTH_MESSAGES } from "../../../../testing/fakes/FakeAuth";
import { test } from "./VerifyEmailPage.robot";

test("email verified", async ({ verifyEmail }) => {
  await verifyEmail.open();
  await verifyEmail.seesNotice(AUTH_MESSAGES.verified);
  await verifyEmail.capture("verify-email.png");
});

test("email verified in dark mode", async ({ verifyEmail }) => {
  await verifyEmail.dark();
  await verifyEmail.open();
  await verifyEmail.seesNotice(AUTH_MESSAGES.verified);
  await verifyEmail.capture("verify-email-dark.png");
});

test("link without a token", async ({ verifyEmail }) => {
  await verifyEmail.open(null);
  await verifyEmail.seesError("Missing verification token");
  await verifyEmail.capture("verify-email-missing-token.png");
});

test("expired link", async ({ verifyEmail }) => {
  await verifyEmail.open("expired-token");
  await verifyEmail.seesError(AUTH_MESSAGES.badVerifyToken);
  await verifyEmail.capture("verify-email-failed.png");
});
