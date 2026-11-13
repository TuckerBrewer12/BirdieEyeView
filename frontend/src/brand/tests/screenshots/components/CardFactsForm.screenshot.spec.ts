import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../../previewScreenshot";

test.describe("CardFactsForm", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "CardFactsForm", "card-facts-form.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "CardFactsForm", "card-facts-form-dark.png");
  });
});
