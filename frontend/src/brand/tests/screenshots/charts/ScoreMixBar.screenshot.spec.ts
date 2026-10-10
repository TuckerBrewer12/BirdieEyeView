import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("ScoreMixBar", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "ScoreMixBar", "score-mix-bar.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "ScoreMixBar", "score-mix-bar-dark.png");
  });
});
