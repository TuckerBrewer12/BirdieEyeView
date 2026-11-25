import { AUTH_MESSAGES } from "../../../../testing/fakes/FakeAuth";
import { test } from "./VerifyPendingPage.robot";

test("waiting for the link, light and dark", async ({ verifyPending }) => {
  await verifyPending.open();
  await verifyPending.seesEmail("sam@example.com");
  await verifyPending.capture("verify-pending.png");
  await verifyPending.switchToDark();
  await verifyPending.capture("verify-pending-dark.png");
});

test("another link sent", async ({ verifyPending }) => {
  await verifyPending.open();
  await verifyPending.resend();
  await verifyPending.seesNotice(AUTH_MESSAGES.verificationSent);
  await verifyPending.capture("verify-pending-sent.png");
});
