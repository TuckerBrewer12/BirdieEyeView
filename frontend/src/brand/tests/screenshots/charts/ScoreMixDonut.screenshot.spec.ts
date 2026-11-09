import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("ScoreMixDonut", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "ScoreMixDonut", "score-mix-donut.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "ScoreMixDonut", "score-mix-donut-dark.png");
  });
});
