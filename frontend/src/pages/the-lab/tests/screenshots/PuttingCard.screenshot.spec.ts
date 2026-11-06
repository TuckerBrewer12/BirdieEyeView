import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../../../brand/tests/previewScreenshot";

test.describe("PuttingCard", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "PuttingCard", "putting-card.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "PuttingCard", "putting-card-dark.png");
  });
});
