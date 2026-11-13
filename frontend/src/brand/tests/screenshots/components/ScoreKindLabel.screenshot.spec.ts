import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("ScoreKindLabel", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "ScoreKindLabel", "score-kind-label.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "ScoreKindLabel", "score-kind-label-dark.png");
  });
});
