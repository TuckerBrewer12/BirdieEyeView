import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../previewScreenshot";

test.describe("Card", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "Card", "card.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "Card", "card-dark.png");
  });
});
