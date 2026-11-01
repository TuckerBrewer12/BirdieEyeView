import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../../../brand/tests/previewScreenshot";

test.describe("AuthNotice", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "AuthNotice", "auth-notice.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "AuthNotice", "auth-notice-dark.png");
  });
});
