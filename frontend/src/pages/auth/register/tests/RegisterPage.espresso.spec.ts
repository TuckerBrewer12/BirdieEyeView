import { expect } from "@playwright/test";
import { AUTH_MESSAGES } from "../../../../testing/fakes/FakeAuth";
import { pebbleBeach } from "../../../../testing/fixtures/courses";
import { test } from "./RegisterPage.robot";

test("a new account is created with its handicap and home course, then waits for the link", async ({
  register,
}) => {
  await register.open();
  await register.fillIn({ handicap: "+2.5" });
  await register.pickHomeCourse("Pebble", pebbleBeach.name!);
  await register.submit();

  await register.isWaitingForVerification("sam@example.com");
  await register.seesNotice(AUTH_MESSAGES.registered);
  expect(register.backend?.registrations).toEqual([
    {
      name: "Sam Snead",
      email: "sam@example.com",
      password: "birdie123",
      handicap: -2.5,
      home_course_id: pebbleBeach.id,
    },
  ]);
});

test("a home course changed back to none is not sent", async ({ register }) => {
  await register.open();
  await register.fillIn({});
  await register.pickHomeCourse("Pebble", pebbleBeach.name!);
  await register.changeHomeCourse();
  await register.submit();

  await register.isWaitingForVerification("sam@example.com");
  expect(register.backend?.registrations).toEqual([
    expect.objectContaining({ email: "sam@example.com", home_course_id: null }),
  ]);
});

test("an email already in use stays here and says so", async ({ register }) => {
  await register.open();
  await register.fillIn({ email: "test@example.com" });
  await register.submit();

  await register.seesError(AUTH_MESSAGES.emailTaken);
  await register.isAt("/register");
});

test("passwords that don't match are caught before anything is sent", async ({ register }) => {
  await register.open();
  await register.fillIn({ password: "birdie123", confirm: "birdie321" });
  await register.submit();

  await register.seesFieldError("Passwords do not match.");
  expect(register.backend?.registrations).toEqual([]);
});
