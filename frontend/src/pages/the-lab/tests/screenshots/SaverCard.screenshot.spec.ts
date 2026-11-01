import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../../../brand/tests/previewScreenshot";

test.describe("SaverCard", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "SaverCard", "saver-card.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "SaverCard", "saver-card-dark.png");
  });
});
