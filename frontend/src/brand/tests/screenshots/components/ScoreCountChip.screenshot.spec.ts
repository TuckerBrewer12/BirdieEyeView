import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("ScoreCountChip", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "ScoreCountChip", "score-count-chip.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "ScoreCountChip", "score-count-chip-dark.png");
  });
});
