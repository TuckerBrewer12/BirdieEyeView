import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("CardRowOrder", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "CardRowOrder", "card-row-order.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "CardRowOrder", "card-row-order-dark.png");
  });
});
