import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("MilestoneFeed", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "MilestoneFeed", "milestone-feed.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "MilestoneFeed", "milestone-feed-dark.png");
  });
});
