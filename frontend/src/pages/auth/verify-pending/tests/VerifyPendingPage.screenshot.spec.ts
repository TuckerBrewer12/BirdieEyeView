import { AUTH_MESSAGES } from "../../../../testing/fakes/FakeAuth";
import { test } from "./VerifyPendingPage.robot";

test("waiting for the link", async ({ verifyPending }) => {
  await verifyPending.open();
  await verifyPending.capture("verify-pending.png");
});

test("waiting for the link in dark mode", async ({ verifyPending }) => {
  await verifyPending.dark();
  await verifyPending.open();
  await verifyPending.capture("verify-pending-dark.png");
});

test("another link sent", async ({ verifyPending }) => {
  await verifyPending.open();
  await verifyPending.resend();
  await verifyPending.seesNotice(AUTH_MESSAGES.verificationSent);
  await verifyPending.capture("verify-pending-sent.png");
});
