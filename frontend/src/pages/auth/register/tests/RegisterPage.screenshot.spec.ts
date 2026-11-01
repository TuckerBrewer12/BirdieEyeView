import { pebbleBeach } from "../../../../testing/fixtures/courses";
import { test } from "./RegisterPage.robot";

test("create account", async ({ register }) => {
  await register.open();
  await register.capture("register.png");
});

test("create account in dark mode", async ({ register }) => {
  await register.dark();
  await register.open();
  await register.capture("register-dark.png");
});

test("fields that can't be sent", async ({ register }) => {
  await register.open();
  await register.fillIn({ password: "short", confirm: "shorter", handicap: "62" });
  await register.submit();
  await register.seesFieldError("Passwords do not match.");
  await register.capture("register-invalid.png");
});

test("home course picked", async ({ register }) => {
  await register.open();
  await register.fillIn({ handicap: "+2.5" });
  await register.pickHomeCourse("Pebble", pebbleBeach.name!);
  await register.capture("register-home-course.png");
});
