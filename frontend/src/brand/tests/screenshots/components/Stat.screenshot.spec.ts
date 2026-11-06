import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("Stat", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "Stat", "stat.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "Stat", "stat-dark.png");
  });
});
