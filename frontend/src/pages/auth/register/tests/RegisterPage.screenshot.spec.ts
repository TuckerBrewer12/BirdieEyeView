import { test } from "./RegisterPage.robot";

test("create account, light and dark", async ({ register }) => {
  await register.open();
  await register.seesHeading("Create account");
  await register.capture("register.png");
  await register.switchToDark();
  await register.capture("register-dark.png");
});

test("a password too short to send", async ({ register }) => {
  await register.open();
  await register.fillIn({ password: "short" });
  await register.submit();
  await register.seesFieldError("Password must be at least 8 characters.");
  await register.capture("register-invalid.png");
});
