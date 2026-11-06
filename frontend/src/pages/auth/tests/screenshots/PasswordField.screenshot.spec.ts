import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../../../brand/tests/previewScreenshot";

test.describe("PasswordField", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "PasswordField", "password-field.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "PasswordField", "password-field-dark.png");
  });
});
