import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../../../brand/tests/previewScreenshot";

test.describe("AuthCard", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "AuthCard", "auth-card.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "AuthCard", "auth-card-dark.png");
  });
});
