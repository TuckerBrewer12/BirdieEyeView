import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("CountBadge", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "CountBadge", "count-badge.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "CountBadge", "count-badge-dark.png");
  });
});
