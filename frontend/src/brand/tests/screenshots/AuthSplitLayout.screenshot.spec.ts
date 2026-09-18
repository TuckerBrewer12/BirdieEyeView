import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../previewScreenshot";

test.describe("AuthSplitLayout", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "AuthSplitLayout", "auth-split-layout.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "AuthSplitLayout", "auth-split-layout-dark.png");
  });
});
