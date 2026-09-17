import { test } from "@playwright/test";
import { capturePreview, enableDark } from "../previewScreenshot";

test.describe("Field", () => {
  test("light", async ({ page }) => {
    await capturePreview(page, "Field", "field.png");
  });

  test("dark", async ({ page }) => {
    await enableDark(page);
    await capturePreview(page, "Field", "field-dark.png");
  });
});
