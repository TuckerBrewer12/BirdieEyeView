import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../../../brand/tests/previewScreenshot";

test.describe("PeakGameCard", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "PeakGameCard", "peak-game-card.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "PeakGameCard", "peak-game-card-dark.png");
  });
});
