import { expect } from "@playwright/test";
import { AUTH_MESSAGES } from "../../../../testing/fakes/FakeAuth";
import { test } from "./VerifyPendingPage.robot";

const RATE_LIMITED = "Too many verification resend attempts. Please try again later.";

test("another link goes to the email carried over from Register", async ({ verifyPending }) => {
  await verifyPending.open("sam@example.com");
  await verifyPending.seesEmail("sam@example.com");
  await verifyPending.resend();
  await verifyPending.seesNotice(AUTH_MESSAGES.verificationSent);
  expect(verifyPending.backend?.verificationResends).toEqual(["sam@example.com"]);
});

test("a refused resend says why", async ({ verifyPending }) => {
  await verifyPending.open("sam@example.com", { authErrors: { "resend-verification": RATE_LIMITED } });
  await verifyPending.resend();
  await verifyPending.seesError(RATE_LIMITED);
});

test("a signed-in verified session goes home", async ({ verifyPending }) => {
  await verifyPending.openVerified();
  await verifyPending.isAt("/");
});
