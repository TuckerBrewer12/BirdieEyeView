import { expect } from "@playwright/test";
import { AUTH_MESSAGES } from "../../../../testing/fakes/FakeAuth";
import { test } from "./RegisterPage.robot";

test("a new account is created with a name, email and password, then waits for the link", async ({ register }) => {
  await register.open();
  await register.fillIn({});
  await register.submit();

  await register.isWaitingForVerification("sam@example.com");
  await register.seesNotice(AUTH_MESSAGES.registered);
  expect(register.backend?.registrations).toEqual([
    expect.objectContaining({ name: "Sam Snead", email: "sam@example.com", password: "birdie123" }),
  ]);
});

test("an email already in use stays here and says so", async ({ register }) => {
  await register.open();
  await register.fillIn({ email: "test@example.com" });
  await register.submit();

  await register.seesError(AUTH_MESSAGES.emailTaken);
  await register.isAt("/register");
});

test("a short password is caught before anything is sent", async ({ register }) => {
  await register.open();
  await register.fillIn({ password: "short" });
  await register.submit();

  await register.seesFieldError("Password must be at least 8 characters.");
  expect(register.backend?.registrations).toEqual([]);
});
