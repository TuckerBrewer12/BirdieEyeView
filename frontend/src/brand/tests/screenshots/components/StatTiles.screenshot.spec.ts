import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("StatTiles", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "StatTiles", "stat-tiles.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "StatTiles", "stat-tiles-dark.png");
  });
});
