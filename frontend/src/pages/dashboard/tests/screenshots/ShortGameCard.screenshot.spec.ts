import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../../../brand/tests/previewScreenshot";

test.describe("ShortGameCard", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "ShortGameCard", "short-game-card.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "ShortGameCard", "short-game-card-dark.png");
  });
});
