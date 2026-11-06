import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../../../brand/tests/previewScreenshot";

test.describe("AuthLink", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "AuthLink", "auth-link.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "AuthLink", "auth-link-dark.png");
  });
});
