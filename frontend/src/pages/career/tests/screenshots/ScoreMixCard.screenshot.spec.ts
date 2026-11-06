import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../../../brand/tests/previewScreenshot";

test.describe("ScoreMixCard", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "ScoreMixCard", "score-mix-card.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "ScoreMixCard", "score-mix-card-dark.png");
  });
});
