import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("RoundShareCard", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "RoundShareCard", "round-share-card.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "RoundShareCard", "round-share-card-dark.png");
  });
});
