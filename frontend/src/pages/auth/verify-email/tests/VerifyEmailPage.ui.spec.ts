import { expect } from "@playwright/test";
import { AUTH_MESSAGES } from "../../../../testing/fakes/FakeAuth";
import { test } from "./VerifyEmailPage.robot";

test("the emailed link verifies the account and signs it in", async ({ verifyEmail }) => {
  await verifyEmail.open();
  await verifyEmail.seesNotice(AUTH_MESSAGES.verified);
  await verifyEmail.isAt("/verify-email");
  expect(verifyEmail.backend?.signedOut).toBe(false);
});

test("a spent or expired link says so", async ({ verifyEmail }) => {
  await verifyEmail.open("expired-token");
  await verifyEmail.seesError(AUTH_MESSAGES.badVerifyToken);
});
