import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("IconBadge", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "IconBadge", "icon-badge.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "IconBadge", "icon-badge-dark.png");
  });
});
