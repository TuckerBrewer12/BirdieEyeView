import { expect } from "@playwright/test";
import { AUTH_MESSAGES } from "../../../../testing/fakes/FakeAuth";
import { test } from "./ForgotPasswordPage.robot";

const RATE_LIMITED = "Too many reset attempts. Please try again later.";

test("asking for a link says one is on its way", async ({ forgot }) => {
  await forgot.open();
  await forgot.requestLink(" sam@example.com ");
  await forgot.seesNotice(AUTH_MESSAGES.resetSent);
  expect(forgot.backend?.resetRequests).toEqual(["sam@example.com"]);
});

test("a refused request says why", async ({ forgot }) => {
  await forgot.open({ authErrors: { "forgot-password": RATE_LIMITED } });
  await forgot.requestLink("sam@example.com");
  await forgot.seesError(RATE_LIMITED);
});
